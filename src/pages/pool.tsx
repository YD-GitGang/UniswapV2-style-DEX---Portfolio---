import { useContext } from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { ChainContext } from '@/components/ChainContext'
import Header from '@/components/Header'

const PoolPage: NextPage = () => {
    const { chainId, currentAccount }: any = useContext(ChainContext)

    return (
        <>
            <Head>
                <title>milkSwap | Pool</title>
            </Head>
            <Header page='pool'/>
            <p>Here is PoolPage</p>
            <p>ChainId: {chainId}</p>
            <p>currentAccount: {currentAccount}</p>
        </>
    )
}

export default PoolPage