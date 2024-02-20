import { createContext, useState } from 'react'
import type React from 'react'
import { ethers, providers } from 'ethers'
import detectEthereumProvider from '@metamask/detect-provider'

type Chain = any
export const ChainContext = createContext<Chain>({})

type ChainContextProviderProps = { children: React.ReactNode }
export const ChainContextProvider = ({ children }: ChainContextProviderProps) => {
    const [chainId, setChainId] = useState<number>()  //(※1)
    const [currentAccount, setCurrentAccount] = useState<string>()  //(※2)
    const [test1, setTest1] = useState<any>()  //provider の中身見る用 無視して良い
    const [test2, setTest2] = useState<any>()  //ethersProvider の中身見る用 無視して良い
    /*
     - (※1)とか(※2)を関数コンポーネント外に書いたらダメなのかなと試しに書いたらエラー吐いてなんでかなーと思ってたけど、
     - フックを呼び出すのはReactの関数内のみらしい。
     - 参照: https://ja.legacy.reactjs.org/docs/hooks-rules.html
    */

    async function connectWallet() {
        const provider = await detectEthereumProvider({ silent: true });  //(※3)
        if (provider) {
            const ethersProvider = new providers.Web3Provider(provider)

            //account
            const accountList: string[] = await ethersProvider.listAccounts()  //(※4)
            if(accountList.length === 0) { alert('Please unlock the MetaMask wallet and/or manually connect the MetaMask to the current site.'); return }
            setCurrentAccount(ethers.utils.getAddress(accountList[0]))
            
            //chainId
            const network = await ethersProvider.getNetwork()  //(※5)
            const chainId = network.chainId
            setChainId(chainId)

            setTest1(provider)  //provider の中身見る用 無視して良い
            setTest2(ethersProvider)  //ethersProvider の中身見る用 無視して良い
        } else {
            alert('Please install Metamask wallet')
        }
    }
    /*
     - (※3)
     - "DetectEthereumProvider"は、ブラウザがEthereumプロバイダ（たとえば、MetaMask）を提供しているかどうかを検出するのだろう。
     - つまりここで定義したprovider変数はメタマスクそのものと考えていい...多分。
     - Ethereumプロバイダは、ウェブページとEthereumブロックチェーンとの間の通信を担当して、ユーザーのアカウントの管理やトランザクションの署名
     - などを担当。
     - "DetectEthereumProvider"によりウェブ開発者はユーザーがEthereumプロバイダを持っているかどうかを確認しできる。だから例えばな使い方として、
     - ユーザーがMetaMaskをインストールしていなかったら特定のアクションを促すメッセージを表示する、みたいな使い方ができる。
     -
     = (※4)(※5)
     - awaitしなくても良さそうなのになと思った。というのもethersProviderに値があるもんだと思ってたから。でもおそらく値そのものはなくて、
     - 値を探しに行く色んな関数があるんだろう、きっと。コンソールに出力して見てみたけど階層深すぎて良く分からなかった...。
    */
    
    return (
        <ChainContext.Provider
            value = {{
                chainId,
                currentAccount,
                connectWallet,
                test1,
                test2
            }}
        >
            {children}
        </ChainContext.Provider>
    )
}

