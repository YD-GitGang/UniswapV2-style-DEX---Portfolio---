# MooSwap
<p align="center">
  <a href="https://mooswap-finance.vercel.app">
      <img src="public/dex_logo_v4.svg" height="128">
  </a>
</p>

This is an AMM-based DEX available on the Polygon mainnet (PoS). Supported tokens are WETH, USDC.e, USDT, WBTC, and DAl.  
Site URL [https://mooswap-finance.vercel.app/](https://mooswap-finance.vercel.app/)

## Main Features
### Swap
<table style="width: 100%;">
  <tr>
    <td style="width: 426px;"><img src="public/img/swap.gif" alt="GIF demo swap" style="max-width: 100%;"></td>
    <td>This feature is used when you want to exchange tokens, such as exchanging WETH for DAI. However, in this case, a pool containing WETH and DAI must already exist. The exchange rate is determined by a constant product formula. The fee is 0.3%. This fee is the reward for the liquidity providers who created the pool.</td>
  </tr>
</table>

### Add Liquidity
<table style="width: 100%;">
  <tr>
    <td style="width: 426px;"><img src="public/img/add_liquidity.gif" alt="GIF demo add liquidity" style="max-width: 100%;"></td>
    <td>This feature allows liquidity providers to offer two types of tokens for those who want to swap. This will create a pool if one does not already exist, or it will add liquidity to the existing pool. Liquidity providers are issued liquidity tokens.</td>
  </tr>
</table>

### Remove Liquidity
<table style="width: 100%;">
  <tr>
    <td style="width: 426px;"><img src="public/img/remove_liquidity.gif" alt="GIF demo remove liquidity" style="max-width: 100%;"></td>
    <td>This feature is used when you want to withdraw the two types of tokens you provided to the pool. Liquidity tokens are burned, and the tokens you originally provided are returned to you. If the amount you provided has increased, the difference is your profit. This increase comes from the swap fees.</td>
  </tr>
</table>

> [!IMPORTANT]
> If this is your first time accessing this site, please connect the Meta Mask manually as you can see. After that, the "Connect Wallet" button will become active.  
> ![GIF demo connect wallet](public/img/connect_wallet.gif)

## Overview of System Configuration
### Overall Configuration
![img overall system structure](public/img/readme_material_overview_03_reSize.jpg)
### Contract Configuration
![img contract structure](public/img/readme_material_hardhat_02_reSize.jpg)

## Technologies Used
| Category                 | Technology                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Languages                | TypeScript (4.9.5)&ensp; /&ensp; SOLIDITY (0.8.17)&ensp; /&ensp; HTML&ensp; /&ensp; CSS&ensp; /&ensp; BASH |
| Frameworks               | NEXT.js (13.2.1)&ensp; /&ensp; Hardhat (2.12.7)&ensp; /&ensp; tailwindcss (3.2.7)                          |
| Libraries                | React (18.2.0)&ensp; /&ensp; ethers.js (5.7.2)&ensp; /&ensp; headless ui (1.7.12)                          |
| Packages                 | nvm (0.39.3)&ensp; /&ensp; npm (8.19.2)&ensp; /&ensp; dotenv (16.0.3)&ensp; /&ensp; Commander.js (10.0.0)&ensp; /&ensp; PostCSS (8.4.21)&ensp; /&ensp; Autoprefixer (10.4.13)&ensp; /&ensp; METAMASK (2.0.0) |
| Testing Frameworks       | MOCHA&ensp; /&ensp; chai                                                                                   |
| Development Environments | Node.js (v18.12.1)&ensp; /&ensp; WSL2&ensp; /&ensp; ubuntu (20.04)                                         |
| Development Tools        | git&ensp; /&ensp; GitHub&ensp; /&ensp; ESLint (8.35.0)                                                     |
| Hosting・Infrastructure  | Vercel&ensp; /&ensp; alchemy  　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| Design                   | heroicons (2.0.16)                                                                                         |

## Directory Structure
### Overall directory structure
![img overall system structure](public/img/readme_material_directory_overview_02_reSize.jpg)

### The core directory for the frontend
![img overall system structure](public/img/readme_material_directory_components_03_reSize.jpg)

### The core directory for contracts
![img overall system structure](public/img/readme_material_directory_hardhat_02_reSize.jpg)

## Getting Started
### Preliminary setup before cloning the repository (for Windows)
#### WSL and Ubuntu installation (Reference: https://learn.microsoft.com/ja-jp/windows/wsl/install)
```bash
wsl --install -d Ubuntu-20.04
```

#### Node.js installation on WSL (Reference: https://learn.microsoft.com/ja-jp/windows/dev-environment/javascript/nodejs-on-wsl)
```bash
# Install curl (a package necessary for downloading files from the web)
$ sudo apt-get install curl

# Install nvm
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# To apply the changes made to BASH, close and restart PowerShell. Then, enter "wsl" to start WSL.
# If you are using Ubuntu through Windows Terminal, you do not need to enter "wsl." (参考　https://learn.microsoft.com/ja-jp/windows/wsl/setup/environment#set-up-windows-terminal)
# Alternatively, execute the following command:
$ source ~/.bashrc

# Verify nvm installation
$ nvm --version
0.39.3

# Install Node.js
$ nvm install 18.12.1

# Verify successful installation
$ node --version
v18.12.1
$ npm --version
8.19.2
```
#### To allow VSCode to access WSL, install the following extension pack in VSCode
https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack  
(Reference: https://learn.microsoft.com/ja-jp/windows/wsl/tutorials/wsl-vscode)  
From PowerShell’s WSL (or Ubuntu in Windows Terminal), restart VSCode by typing `code .`. You can confirm that the terminal directory in VSCode is pointing to WSL. (You should see a link icon in the bottom-left corner of VSCode.)

> [!NOTE]
> The following items, which can be checked in the Control Panel under "Turn Windows features on or off," should have been automatically enabled by following the previous steps. However, if things are not working correctly, please check and manually enable them if necessary.
> - Hyper-V  
> - Windows Subsystem for Linux
> - Virtual Machine Platform

### Preliminary setup before cloning the repository (for Mac)
```bash
# Install nvm
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Restart the terminal

# Verify nvm installation
$ nvm --version
0.39.3

# Install Node.js
$ nvm install 18.12.1

# Verify successful installation
$ node --version
v18.12.1
$ npm --version
8.19.2
```

#### Install the "code" command in VSCode
Open the command palette with `Cmd + Shift + P`, enter `Shell command: install 'code' command in PATH`, and enable the ability to run the "code" command. This will allow you to launch VSCode from the terminal using `code .`.

### Development Environment Setup
```bash
# Clone the repository locally
$ git clone https://github.com/YD-GitGang/UniswapV2-style-DEX---Portfolio---.git

# Install modules and compile contracts
$ npm ci && cd hardhat && npm ci && npx hardhat compile && cd ../ 
```

#### Deploy Contracts for Simulating a Pseudo-Production Environment:

```bash
npm run test-node
```
This command starts the Hardhat network and deploys the Factory contract and Router contract to the Hardhat network. Additionally, it deploys four tokens and transfers 20,000 units of each token to Hardhat Account 1 and Hardhat Account 2. It also creates pools with some pairs of these four tokens. The addresses of the deployed Factory contract, Router contract, and the four tokens are already recorded in the data folder.

#### Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

#### Metamask Setup for Using the Hardhat Network
Since using the Polygon mainnet can be costly, use the Hardhat network during development. Add the following settings in Metamask under *Settings* > *Networks*:
- Network name : Local HardhatNetwork  
- New RPC URL : http://127.0.0.1:8545  
- Chain ID : 31337  
- Currency symbol : ETH  

Then, create three accounts in Metamask for the Hardhat network.

> [!IMPORTANT]
> - If you restart the Hardhat network with `npm run test-node`, please reset your Metamask account used for the Hardhat network by going to *Settings* > *Advanced* > *Clear activity and nonce data*. (Note: This operation will only clear the information related to the currently selected network and the currently selected account.)
>
> - If you try to use Metamask with the Hardhat network while the Hardhat network is not running, Metamask may freeze.

#### VSCode Extensions
- Solidity (by Juan Blanco)

At this point, your local development environment using the Hardhat network should be set up.

## Deploy the Contract to Production
Create a `.env` file, and write `PRIVATE_KEY="hoge"`, `SEPOLIA_URL="fuga"`, and `POLYGON_URL="piyo"` in it.

Execute the `deployUniswapStyleDex.ts` script in the `scripts` folder to deploy the contract to the network (Polygon mainnet). At this time, uncomment the parts of the `hardhat.config.ts` file that are currently commented out (When hosting on Vercel, comment them out again):

```bash
$ cd hardhat

$ npx hardhat run --network polygon scripts/deployUniswapStyleDex.ts

$ cd ../

# At this time, the contract data will be displayed in the console. Please add it to the "contract.json" file in the "data" folder.
```
You should be able to verify that the contract deployed to the production environment is functioning properly by checking it at `localhost:3000` :
```bash
$ cd hardhat

$ npx hardhat compile

$ cd ../

$ npm run build

$ npm run start
```

### Host the Frontend Code on Vercel
When you deployed the contract to the production environment, you uncommented parts of `hardhat.config.ts`, but please comment them out again. The reason is that the `.env` file used during the contract deployment is not included in the GitHub repository.

Build command to set in Vercel when hosting:
```
npm run compile --prefix hardhat && npm run build
```
Install command to set in Vercel when hosting:
```
npm ci && npm ci --prefix hardhat
```
At this point, the UI hosted on Vercel should be able to access the contract deployed to production.

## Test coverage rate

File                               |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------------------|----------|----------|----------|----------|----------------|
 contracts/                        |    94.55 |    68.63 |       84 |    94.84 |                |
  uniswapV2StyleDexERC20.sol       |    83.33 |       50 |    66.67 |    89.47 |    29,33,37,49 |
  uniswapV2StyleDexFactory.sol     |      100 |       50 |      100 |      100 |                |
  uniswapV2StyleDexPool.sol        |      100 |     82.5 |      100 |      100 |                |
  uniswapV2StyleDexRouter.sol      |    94.12 |    64.29 |      100 |     91.3 |    39,40,81,82 |
 contracts/interfaces/             |      100 |      100 |      100 |      100 |                |
  IERC20.sol                       |      100 |      100 |      100 |      100 |                |
 contracts/libraries/              |      100 |    78.57 |      100 |      100 |                |
  Math.sol                         |      100 |    83.33 |      100 |      100 |                |
  uniswapV2StyleDexLibrary.sol     |      100 |       75 |      100 |      100 |                |
 contracts/test/                   |    60.71 |       30 |    56.25 |    68.75 |                |
  MathTest.sol                     |      100 |      100 |      100 |      100 |                |
  TokenTest.sol                    |    60.71 |       30 |    41.67 |    65.91 |... 59,60,61,62 |
  uniswapV2StyleDexLibraryTest.sol |      100 |      100 |      100 |      100 |                |
-----------------------------------|----------|----------|----------|----------|----------------|
All files                          |    88.59 |    63.97 |    75.56 |    89.55 |                |


## Fees and other notes
- The swap fee is 0.3% of the deposit.
- The minimum transaction amount for swap, remove, and add liquidity is set to 0 (a 100% slippage tolerance).
- The remove amount is not adjustable and will be the full amount.

## License

This project is unlicensed and all its contents are proprietary and confidential. No part of this project may be copied, modified, or distributed without the explicit permission of the author. Unauthorized use is strictly prohibited.

## Donations

If you would like to support the development of future projects or help pay my next month's rent, you can donate ETH to `0x84fE8C7704a24a0604863718522c8426885105Af`.
