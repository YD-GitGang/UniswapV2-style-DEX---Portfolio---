import { useContext } from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { ChainContext } from '@/components/ChainContext'
import Header from '@/components/Header'

const SwapPage: NextPage = () => {
    const { chainId, currentAccount }: any = useContext(ChainContext)

    return (
        <>
            <Head>
                <title>UniswapV2StyleDex Swap</title>
            </Head>
            <Header />
            <p>Here is Swap Page</p>
            <p>ChainId: {chainId}</p>
            <p>currentAccount: {currentAccount}</p>
        </>
    )
}

export default SwapPage