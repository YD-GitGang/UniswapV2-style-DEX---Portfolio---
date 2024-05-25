import { useContext } from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { ChainContext } from '@/components/ChainContext'
import Header from '@/components/Header'
import Pool from '@/components/Pool'

const PoolPage: NextPage = () => {
    const { chainId, currentAccount }: any = useContext(ChainContext)

    return (
        <>
            <Head>
                <title>MooSwap | Pool</title>
            </Head>
            <Header page='pool'/>
            <Pool/>
        </>
    )
}

export default PoolPage