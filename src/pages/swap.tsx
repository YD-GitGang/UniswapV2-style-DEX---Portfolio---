import { useContext } from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { ChainContext } from '@/components/ChainContext'
import Header from '@/components/Header'
import Swap from '@/components/Swap'

const SwapPage: NextPage = () => {
    const { chainId, currentAccount }: any = useContext(ChainContext)

    return (
        <>
            <Head>
                <title>MooSwap</title>
                <meta name="description" content="MooSwap is a decentralized exchange (DEX) available on the Polygon (PoS) for traders and liquidity providers." />
                <meta name="google-site-verification" content="MeeG3wA-7GLXGU8yjKeP8SrdVF1_97lRaok4pGgys4Q" />
            </Head>
            <Header page='swap'/>
            <Swap />
        </>
    )
}

export default SwapPage