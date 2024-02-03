import { useContext } from 'react'
import type { NextPage } from 'next'
import { ChainContext } from '@/components/ChainContext'
import Link from 'next/link'

const Header: NextPage = () => {
    const { connectWallet, aaa, bbb } = useContext(ChainContext)
    console.log(aaa)  //provider の中身見る用 無視して良い
    console.log(bbb)  //ethersProvider の中身見る用 無視して良い

    return (
        <>
            <div>
                <Link href="/swap"> [jump to swap] </Link>
                <Link href="/pool"> [jump to pool] </Link>
            </div>
            <div onClick={() => connectWallet()}>
                <div> [Connect Wallet] </div>
            </div>
            <p>--------------------End of Header--------------------</p>
        </>
    )
}

export default Header