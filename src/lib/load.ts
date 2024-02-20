import _chains from '../../data/chains.json'

const chains: ChainData[] = _chains   // (※3)

export interface ChainData {
    chainId: number
    name: string
    symbol: string
    explorer: string
    logo: string
}
//interfaceエキスポートしてるけど、どこでインポートして使ってるんだ...
//カンマで区切っても区切らなくてもいけるの不思議
//(※3)以前に書かなくてもokなの不思議

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