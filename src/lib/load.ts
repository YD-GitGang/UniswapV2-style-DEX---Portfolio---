import _chains from '../../data/chains.json'
import _tokens from '../../data/tokens.json'
import _contracts from '../../data/contracts.json'

const chains: ChainData[] = _chains   // (※3)
const tokens: TokenData[] = _tokens
const contracts: ContractData[] = _contracts

export interface ChainData {
    chainId: number
    name: string
    symbol: string
    explorer: string
    logo: string
}
//カンマで区切っても区切らなくてもいけるの不思議
//(※3)以前に書かなくてもokなの不思議

export interface TokenData {
    chainId: number
    address: string
    symbol: string
    name: string
    decimals: number
    logo: string
}
//エキスポートしてPool.tsxで使ってる

export interface ContractData {
    chainId: number
    factory: string
    router: string
}

export function loadChainData(chainId: number): ChainData | undefined {
    return chains.filter((d: ChainData) => d.chainId === chainId)[0]
}
//chains.filter((d: ChainData) => {d.chainId === chainId})この書き方するならreturnいれろ。{return d.chainId === chainId}
//参考: https://typescriptbook.jp/reference/functions/arrow-functions

export function loadChainLogo(chainId: number): string {
    const chain = loadChainData(chainId)
    if (chain !== undefined) {       //(※1)
        return `/${chain.logo}`
    } else {
        return ''     //(※2)
    }
}
/*
 - (※1)
 - if(chain)と同じこと。
 - 
 - (※2)
 - このパターンが発動することはない。Headerコンポーネントの(※3)のように、chainId が undefined になるときは
 - loadChainLogo の代わりに ExclamationTriangleIcon が使われるから。
 - だとしたら要らないように思えるが、stringを必ずリターンしないといけないから必要。
 - loadChainLogo関数の返値の型をstringと指定しているのに、else以降を消してしまうと返値がないパターンが生まれてしまう。
 - 例えばchainがundefinedだったら何もリターンしないことになってしまう。だから飾りでいいから空文字で凌ぐ。
*/

export function loadTokenList(chainId: number): TokenData[] {
    return tokens.filter((d: TokenData) => d.chainId === chainId)  // (※5)
}

export function loadTokenData(chainId: number, address: string): TokenData | undefined {
    return tokens.filter(
        (d: TokenData) => (d.chainId === chainId) && d.address.toLowerCase() === address.toLowerCase()
    )[0]   // (※6)
}
/*
 - (※5)(※6)
 - (※6)は(※5)と違って返り値が配列じゃないから[0]ってして取り出してる。
 - (※6)
 - ネットワークが違ってもアドレスってかぶったりするのかな。keccak256の中よく分からんが、もしかぶらないなら
 - loadTokenDataの引数アドレスだけでいいのになって。
*/

export function loadTokenLogo(chainId: number, address: string): string {
    const token = loadTokenList(chainId).filter((tkn: TokenData) => tkn["address"] === address)[0]  // (※4)
    /*
     - これでもOK↓
     - const token = tokens.filter((d: TokenData) => d["chainId"] === chainId && d["address"] === address)[0]
     - const token = loadTokenData(chainId, address)
    */
    if(token !== undefined) {
        return `/${token["logo"]}`
    } else {
        return "/tokens/Default.svg"
    }
}
/*
 - (※4)
 - tkn.address でも　tkn["address"]　でもどっちでもOK。書き方が2通りあるってだけ。
 - tkn["address"]の書き方の時何故toLowerCase()が不要なんだろう。
*/

export function loadContractData(chainId: number): ContractData | undefined {
    return contracts.filter((d: ContractData) => d.chainId === chainId)[0]
}