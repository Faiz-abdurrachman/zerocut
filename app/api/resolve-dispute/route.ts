import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'wagmi/chains'
import { ABI, CONTRACT_ADDRESS } from '@/lib/contract'
import { evaluateDispute } from '@/lib/ai'

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://testnet-rpc.monad.xyz'),
})

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json()
    if (jobId === undefined || jobId === null) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 })
    }

    // 1. Read job from contract
    const job = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'getJob',
      args: [BigInt(jobId)],
    }) as { description: string; workUrl: string; status: number }

    if (job.status !== 5) { // 5 = DISPUTED
      return NextResponse.json({ error: 'Job is not in DISPUTED state' }, { status: 400 })
    }

    // 2. AI evaluates the dispute
    const verdict = await evaluateDispute(job.description, job.workUrl)

    // 3. Map outcome string to enum index
    const outcomeMap = { RELEASE: 0, REFUND: 1, SPLIT: 2 } as const
    const outcomeIndex = outcomeMap[verdict.outcome]

    // 4. Hash the reasoning as on-chain proof
    const verdictHash = keccak256(toBytes(verdict.reasoning))

    // 5. Oracle wallet signs + sends resolveDispute tx
    const account = privateKeyToAccount(process.env.ORACLE_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http('https://testnet-rpc.monad.xyz'),
    })

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'resolveDispute',
      args: [
        BigInt(jobId),
        outcomeIndex,
        verdict.freelancerPercent,
        verdictHash,
        verdict.reasoning,
      ],
    })

    return NextResponse.json({
      verdict: verdict.outcome,
      freelancerPercent: verdict.freelancerPercent,
      reasoning: verdict.reasoning,
      verdictHash,
      txHash,
    })
  } catch (err) {
    console.error('resolve-dispute error:', err)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}
