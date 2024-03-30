import { createContext, useState } from 'react'
import type React from 'react'
import { ethers, providers, BigNumber } from 'ethers'
import type { Signer, Contract } from 'ethers'
import detectEthereumProvider from '@metamask/detect-provider'
import { loadTokenData, loadContractData } from '@/lib/load'
import IERC20 from '../../hardhat/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import uniswapV2StyleDexFactory from '../../hardhat/artifacts/contracts/uniswapV2StyleDexFactory.sol/uniswapV2StyleDexFactory.json'
const MAX_INT256 = BigNumber.from(2).pow(256).sub(1)  //なんで+とか-とか普通の記号使えないんだっけ...

type Chain = any
export const ChainContext = createContext<Chain>({})

type ChainContextProviderProps = { children: React.ReactNode }
export const ChainContextProvider = ({ children }: ChainContextProviderProps) => {
    const [chainId, setChainId] = useState<number>()  //(※1)
    const [currentAccount, setCurrentAccount] = useState<string>()  //(※2)
    const [signer, setSigner] = useState<Signer>()
    const [factoryAddress, setFactoryAddress] = useState<string>()
    const [routerAddress, setRouterAddress] = useState<string>()
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
            const ethersProvider = new providers.Web3Provider(provider)  // (※10)
            //account
            const accountList: string[] = await ethersProvider.listAccounts()  //(※4)
            if(accountList.length === 0) { alert('Please unlock the MetaMask wallet and/or manually connect the MetaMask to the current site.'); return }
            setCurrentAccount(ethers.utils.getAddress(accountList[0]))
            //chainId
            const network = await ethersProvider.getNetwork()  //(※5)
            const chainId = network.chainId
            setChainId(chainId)
            // signer
            const signer = ethersProvider.getSigner()  // (※6)
            setSigner(signer)    // (※9)
            // contract address
            setFactoryAddress(loadContractData(chainId)?.factory)  // (※8)(※9)。 ?について。possibly 'undefined'。
            setRouterAddress(loadContractData(chainId)?.router)  // ?について。possibly 'undefined'。

            provider.on("chainChanged", () => { window.location.reload() })  // (※11)
            provider.on("accountsChanged", () => { window.location.reload() })

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
     -
     - (※6)
     - メタマスクの場合秘密鍵って各アカウント毎に違うよね。シークレットリカバリーフレーズは1つだけど。なら「ethersProvider.各アカウント.getSigner()」
     - ってなると思ったけど。getSigner()で取ってくるのは秘密鍵じゃなくて署名用の何かなのかな。
     - currentAccountはethersProvider.listAccotnt()の配列の0番目の要素を取り出してるあたり他のアカウント(公開鍵)も配列に入ってるのかもしれない。
     - 0番目にくるのが今使ってるアカウントということなんだろう。となるとメタマスクは各アカウント毎に秘密鍵があるから秘密鍵も配列があってその0番目を
     - 取り出すのかとおもいきや、ethersProvider.getSigner()で取れる秘密鍵的なやつは自動で0番目のアカウント(公開鍵)の秘密鍵なのかなきっと。
     -
     - (※8)
     - 郵便を友達に送る時住所は事前に聞いておく必要あるのと同じ。エクスプローラとかで調べてjsonにメモっとく。
     - アカウントのアドレスはブラウザにイーサリアムプロバイダー(メタマスク)があればそれを手がかりにするからメモいらん。
     -
     - (※9)
     - stateに保持する理由。再レンダリングか再レンダリング毎に変化する変数を再計算したいものは全部stateにしろ。コネクトウォレットボタンを押して
     - ネットワークが変わりchianIdが変わる度に別のネットワークのファクトリーコントラクトやルーターコントラクトに再計算する必要がある。setSignerは、
     - メタマスク内でアカウントを変えたときに再計算する必要がある。どちらも直接画面に映し出される内容ではないがUIのボタンを押して再レンダリングされた時に
     - その再レンダリングの内容にあわせて内部で再評価しなきゃいけない内容。
     -
     - (※10)
     - ethersProviderがプロバイダーだと思ってたが多分違くて、ethersProviderはプロバイダーとか秘密鍵とか公開鍵とかchainIDとか全部入ってるイーサリ
     - アムプロバイダー(今回はメタマスク)そのもの的なやつなんだろう。
     -
     - (※11)
     - こいつは監視対象のイベントがメタマスクから発生すると指定した関数のみ計算する。ということでどこに記述しようが問題ないらしい。Headerコンポーネント
     - に記述しても多分いける。ただ責任の分離などの理由からContextに記述されている多分。そもそもprovider.onのproviderをContextでdetectしてるし。
     - あと第二引数の書き方が直でwindow.〜じゃなくてアロー関数の中にwindow.〜を書いてるけど、この書き方よく見る。おそらく引数とか受け取りたいときとか
     - 他の関数も沢山書きたい様にこういう仕様にしてるんだろう。直で書いたらその直で書いた関数しか実行できないから。
    */
    
    async function getDisplayBalance(address: string): Promise<string> {
        const decimals: number = loadTokenData(chainId!, address)!.decimals  // !について。possibly 'undefined'。
        const tokenContract: Contract = new ethers.Contract(address, IERC20.abi, signer!.provider)  // (※7)。 !について。possibly 'undefined'。
        const balance: BigNumber = await tokenContract.balanceOf(currentAccount)
        return ethers.utils.formatUnits(balance.toString(), decimals)  // (※12)
    }
    /** 
     * (※7)
     * 「ブロックチェーンにデプロイされたコントラクト」から同じく「ブロックチェーンにデプロイされたコントラクト」にアクセスしていたsolidityの時とは
     * 書き方違う。ブロックチェーン上からであればアドレスとインターフェースさえあればokだが、ブロックチェーン外からブロックチェーンにアクセスする場合は
     * abiとか色々必要。
    */

    async function getPoolAddress(addressA: string, addressB: string): Promise<string | undefined> {
        const factoryContract: Contract = new ethers.Contract(factoryAddress!, uniswapV2StyleDexFactory.abi, signer!.provider) //!。possibly 'undefined'
        const poolAddress: string = await factoryContract.getPool(addressA, addressB)
        if ( poolAddress === ethers.constants.AddressZero ) { return undefined } else { return poolAddress } //if(poolAddress === undefined)でもokきっと
    }

    async function getAllowance(address: string): Promise<BigNumber> {
        const tokenContract: Contract = new ethers.Contract(address, IERC20.abi, signer!.provider)  // (※13)。!。possibly 'undefined'
        const allowance = await tokenContract.allowance(currentAccount, routerAddress)
        return allowance
    }
    /** 
     * (※13)
     * signer.providerを見たとき
     * cosnt provider = new ethers.providers.JsonRpcProvider(rpcUrl)
     * const factory = new ethers.ContractFactory(~.abi, ~.bytecode, signer)
     * みたいな素のethersでデプロイする時に作ったsignerに似てるって思った。signerの中からproviderを取り出してる感じとか。
    */

    async function sendApprovalTransaction(address: string): Promise<boolean> {
        const tokenContract: Contract = new ethers.Contract(address, IERC20.abi, signer)
        try {
            const tx = await tokenContract.approve(routerAddress, MAX_INT256)  // (※14)
            const receipt = await tx.wait()  // await tx.wait()だけでok。receipt使わない。
            return true
        } catch (err) {
            return false
        }
    }
    /** 
     * (※14)
     * approveの中のmsg.senderの値ってどうやって取得してんだろう。この関数を実行した人がmsg.senderなわけだけど70行目でsigner渡すからそこから
     * 取得してんのかな。
     * 
     * メタマスクが我々とブロックチェーンを橋渡ししてくれるイメージ。
     * まずメタマスクにハードハットネットワークとかポリゴンネットワークとかネットワーク情報を登録してそのネットワークとメタマスクを接続。
     * detectEthereumProviderをすればブラウザにethereumプロバイダー(今回の場合メタマス)があるか検知し、そのethereumプロバイダーが接続してるネットワ
     * ーク情報とかをゲットする。そのネットワーク情報からchainIdをゲットすれば、dataに登録してるcotractデータ群からメタマスクが今接続してるネットワーク
     * のcontractをチョイスできる。そのコントラクトをコンパイルしたデータを事前に持っておいて、そのコンパイルしたデータからabiを準備する。そしてメタマス
     * クが接続してるネットワークの情報からプロバイダー的なもの?url?をゲットする。このメタマスクからゲットした「chainIdからチョイスしたcontractのアドレ
     * ス」と「コントラクトのabi」と「メタマスクからゲットしたプロバイダーてきなやつ」があれば、この3つから作ったコントラクトのインスタンスを実行したとき
     * にメタマスクがプロバイダーとの橋渡しとして起動する。メタマスクが起動するのは、メタマスクからゲットしたプロバイダーをコントラクトのインスタンスに引
     * 数として渡してるからだろう。めっちゃ多分。
    */

    return (
        <ChainContext.Provider
            value = {{
                chainId,
                currentAccount,
                signer,
                connectWallet,
                getDisplayBalance,
                getPoolAddress,
                getAllowance,
                sendApprovalTransaction,
                routerAddress,
                test1,
                test2
            }}
        >
            {children}
        </ChainContext.Provider>
    )
}

/** 
 * useContextにstate以外に関数も書く理由。多分useContextじゃなくて各コンポーネントで書こうと思えばできる。必要なstateを各コンポーネントでインポートしたりとかすれば。
 * でも、例えばgetPoolAddress。この関数の中ではfactoryAddressというstate以外にsigner!.providerもある。signerを使うにはメタマスクのライブラリをインポ
 * ートしてプロバイダーゲットしてイーサ用にそのプロバイダーを変換したりなど色々やることがある。これを各コンポーネントでやるくらいならひとつにまとめた方がそ
 * りゃ良い。
*/