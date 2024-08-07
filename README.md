# MooSwap
<p align="center">
  <a href="https://mooswap-finance.vercel.app">
      <img src="public/dex_logo_v4.svg" height="128">
  </a>
</p>
Polygon mainnet (PoS) で利用できるAMM型DEXです。Supported tokens are WETH, USDC.e, USDT, WBTC, and DAl.

## 主な機能
### Swap
![GIF demo swap](public/img/swap.gif)

### Add Liquidity
![GIF demo add liquidity](public/img/add_liquidity.gif)

### Remove Liquidity
![GIF demo remove liquidity](public/img/remove_liquidity.gif)

＊If this is your first time accessing this site, please connect the Meta Mask manually as you can see. After that, the "Connect Wallet" button will become active.
![GIF demo connect wallet](public/img/connect_wallet.gif)

## 使用技術
### 言語  
・TypeScript (4.9.5)  
・SOLIDITY (0.8.17)  
・HTML  
・CSS  
・BASH  
### フレームワーク  
・NEXT.js (13.2.1)  
・Hardhat (2.12.7)  
・tailwindcss (3.2.7)  
### ライブラリ  
・React (18.2.0)  
・headless ui (1.7.12)  
・ethers.js (5.7.2)  
### パッケージ  
・nvm (0.39.3)  
・npm (8.19.2)  
・dotenv (16.0.3)  
・Commander.js (10.0.0)  
・PostCSS (8.4.21)  
・Autoprefixer (10.4.13)  
・METAMASK (2.0.0)  
### テストフレームワーク  
・MOCHA  
・chai  
### 開発環境  
・Node.js (v18.12.1)  
・WSL2  
・ubuntu (20.04)  
### 開発ツール  
・git  
・GitHub  
・ESLint (8.35.0)  
### ホスティング・インフラ  
・Vercel  
・alchemy  
### デザイン  
・heroicons (2.0.16)  
### VSCode拡張機能  
Solidity (by Juan Blanco)

## Getting Started

```bash
git clone https://github.com/YD-GitGang/UniswapV2-style-DEX---Portfolio---.git
```

```bash
npm ci && cd hardhat && npm ci && npx hardhat compile && cd ../ 
```

```bash
npm run test-node 
```

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Warning

・Please be advised that we do not accept any inquiries or troubleshooting.

・We are not responsible for any loss of tokens due to unforeseen problems.

・We strongly recommend that you use small amounts.

・The swap fee is 0.3% of the deposit.

・The minimum transaction amount for swap, remove, and add liquidity is set to 0 (a 100% slippage tolerance).

・The remove amount is not adjustable and will be the full amount.


## License

This project is unlicensed and all its contents are proprietary and confidential. No part of this project may be copied, modified, or distributed without the explicit permission of the author. Unauthorized use is strictly prohibited.

## Donations

If you would like to support the development of future projects or help pay my next month's rent, you can donate ETH to `0x84fE8C7704a24a0604863718522c8426885105Af`.