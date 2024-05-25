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
            </Head>
            <Header page='swap'/>
            <Swap />
        </>
    )
}

export default SwapPage