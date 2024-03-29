import { useContext } from 'react'
import { ChainContext } from '@/components/ChainContext'
import Link from 'next/link'
import Image from 'next/image'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { loadChainData, loadChainLogo } from '../lib/load'
import logo from '../../public/dex_logo_v4.svg'
import { headerStyle as style } from '@/styles/tailwindcss'

const Header = (props: {page: string}) => {
    const { chainId, currentAccount, connectWallet, test1, test2 } = useContext(ChainContext)
    console.log(test1)  //provider の中身見る用 無視して良い
    console.log(test2)  //ethersProvider の中身見る用 無視して良い

    const displayAddress = currentAccount ? `${currentAccount.slice(0,7)}...${currentAccount.slice(38)}` : ''  // (※1)

    let chainName: string | undefined   // (※5)
    if (chainId) {
        if (loadChainData(chainId)) {
            chainName = loadChainData(chainId)!.name     // (※4)
        } else {
            chainName = "Unsupported"
        }
    }
    /*
     - (※4)
     - 「!」でundefinedじゃないよってコンパイラーに伝えないとビルドのチェックでエラーになるが、
     - if文で loadChainData(chainId) がtrueの時(undefinedじゃない時)って言っているんだからloadChainData(chainId)が
     - undefinedになるわけがないと思うのだが...何故だ...
     - (※5)
     - constではなくletにすることでchainNameに初期値を入れなくてもOKになっている。初期値が入ってないから最初はundefined状態。
     - chainIdに値が入っていれば(※5)直下のif文が走りchainNameに値が入る。
     - chainIdに値が入っていなければ(つまりウォレットにコネクトしておらずchainIdに値が入ってない時)直下のif文が走らず
     - chainNameはundefinedのままになる。
    */

    return (
        <div className={style.container}>
            <div className={style.logo}>
                <Image src={logo} alt='logo' height={50}/>
                <div>milkSwap</div>
            </div>
            <div className={style.navContainer}>
                <Link href="/swap">
                    <div className={props.page === 'swap' ? style.activeNavItem : style.inactiveNavItem}>
                        Swap
                    </div>
                </Link>
                <Link href="/pool">
                    <div className={props.page === 'pool' ? style.activeNavItem : style.inactiveNavItem}>
                        Pool
                    </div>
                </Link>
            </div>
            <div className={style.buttonsContainer}>
                {chainName === 'Unsupported' ?                       // (※3)
                    (<div className={style.chainContainer}>
                        <ExclamationTriangleIcon className={style.chainIcon}/>
                        <p> {chainName} </p>
                    </div>) : null
                }
                {(chainName !== 'Unsupported') && (chainName !== undefined) ?
                    (<div className={style.chainContainer}>
                        <Image src={loadChainLogo(chainId)} alt='chain logo' height={20} width={20} className={style.chainIcon}/>
                        <p> {chainName} </p>
                    </div>) : null
                }
                { currentAccount ? (
                    <div className={style.accountText}>{displayAddress}</div>     // (※2)
                ) : (
                <div onClick={() => connectWallet()} className={style.connect}>
                    <div className={style.connectText}>
                        Connect Wallet
                    </div>
                </div>)}
            </div>
        </div>
    )
}

export default Header

/*
 - (※1)(※2)
 - (※1)で三項演算子にしてる理由は、メタマスクに接続してなくて currentAccount が undefined でもエラーを吐かないようにするため。
 - コードは上から順に計算していく、(※1)の currentAccount が undefined でもエラーを避けて下のコードに進みたい。そのために undefined
 - だったら displayAddress に何でも良いから別の何かを入れちゃうというわけ(今回の場合だと空文字)。
 - ここでもし「コードは上から順に計算していく」ということをど忘れしてると curenntAccount が undefined だった
 - ら(※2)の三項演算子のように displayAddress ではなく Connect Wallet が表示されるわけで、となると (※1)の displayAddress を計算す
 - る機会がそもそも訪れないから(※1)で三項演算子を使って curenntAccount が undefined だった場合を備える意味がないように思えてしまう
 - ので注意。
 - 
 -
 - 
 - (※3)
 - JSXの中ではif文は使えないから三項演算子で条件分岐してる。
 - JSXの中で条件分岐をする他のやり方として && や || がある。実は「&&」と「||」は「かつ」「または」ではないから。
 -
 - expr1 && expr2 ----------
 - expr1とexpr2が論理型の場合、両方 true だと trueを返し それ以外の場合は false になる。
 - expr1とexpr2が論理型でなければ左から右に向けて評価し、遭遇した最初の偽値のオペランドを直ちに返す、
 - またはすべてが真値であった場合は最後のオペランドの値を返す。
 - 
 - expr3 || expr4 ----------
 - expr3とexpr4が論理型だと、expr3とexpr4のうち 1 つ以上が true である場合に true になる。
 - expr3とexpr4が論理型でなければ左から右に向けて評価し、遭遇した最初の真値のオペランドを直ちに返す、
 - またはすべてが偽値であった場合は最後のオペランドの値を返す。
*/