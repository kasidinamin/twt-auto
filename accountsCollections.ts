import { Keypair } from "@solana/web3.js";
import type { AuthenticationFacade } from "@dialectlabs/sdk";
import {
  DialectSolanaWalletAdapterWrapper,
  NodeDialectSolanaWalletAdapter,
  SolanaEd25519AuthenticationFacadeFactory,
  DialectWalletAdapterSolanaEd25519TokenSigner,
  SolanaEd25519TokenSigner,
} from "@dialectlabs/blockchain-sdk-solana";

import { Duration } from "luxon";
import * as bs58 from "bs58";
import * as fs from "fs";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";
import { generateUsername } from "unique-username-generator";
import {
  DataLoginDialect,
  StickerPackOnboarding,
} from "./interface/login.interface";
import { CollectionResponseDetail } from "./interface/collection.interface";
import question from "./libs/question";

interface createAccountGenerateJWT {
  jwt?: string;
  privateKey?: string;
  publicKey?: string;
}

interface GeneralStatus {
  status?: string;
}

function generateRequestId(leng: number): string {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = leng;
  let requestId = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    requestId += characters.charAt(randomIndex);
  }

  return requestId;
}

async function loginAccountAndGenerateJWT(
  privateKeyData: string
): Promise<createAccountGenerateJWT> {
  let wallet: DialectSolanaWalletAdapterWrapper;
  let walletKeypair: Keypair;
  let signer: SolanaEd25519TokenSigner;
  let authenticationFacade: AuthenticationFacade;

  const uint8ArraySecretKey = bs58.decode(privateKeyData);
  walletKeypair = Keypair.fromSecretKey(uint8ArraySecretKey);
  const privateKey = walletKeypair.secretKey;
  const publicKey = walletKeypair.publicKey;

  // Mendapatkan string dari privateKey dan publicKey
  const privateKeyBs58 = bs58.encode(privateKey);
  const publicKeyString = publicKey.toBase58();

  //@ts-ignore
  wallet = new DialectSolanaWalletAdapterWrapper(NodeDialectSolanaWalletAdapter.create(walletKeypair));

  signer = new DialectWalletAdapterSolanaEd25519TokenSigner(wallet);
  authenticationFacade = new SolanaEd25519AuthenticationFacadeFactory(
    signer
  ).get();

  const token = await authenticationFacade.generateToken(
    Duration.fromObject({ seconds: 10000 })
  );
  const isValid = authenticationFacade.isValid(token);
  if (!isValid) {
    throw new Error("JWT Not Valid!");
  }

  const encodedMessage = new TextEncoder().encode(token.rawValue);
  wallet.signMessage(encodedMessage);

  return {
    jwt: token.rawValue,
    privateKey: privateKeyBs58,
    publicKey: publicKeyString,
  };
}


async function getInventory(
  requestId: string,
  publicKey: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    fetch("https://graphql.tensor.trade/graphql", {
      method: "POST",
      headers: {
        authority: "graphql.tensor.trade",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        origin: "https://dialect.tensor.trade",
        referer: "https://dialect.tensor.trade/",
        "sec-ch-ua":
          '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "x-request-id": requestId,
      },
      body: JSON.stringify([
        {
          operationName: "UserPortfolio",
          variables: {
            wallet: publicKey,
          },
          query:
            "query UserPortfolio($wallet: String!) {\n  inventoryBySlug(owner: $wallet, slugsToInflate: null, includeFrozen: true) {\n    ...ReducedInstrumentWithMints\n    __typename\n  }\n  userActiveListingsV2(wallets: [$wallet], slug: null, sortBy: PriceAsc) {\n    txs {\n      ...ReducedLinkedTxMintWithColl\n      __typename\n    }\n    __typename\n  }\n  userTswapOrders(owner: $wallet) {\n    ...ReducedTSwapPoolWithColl\n    __typename\n  }\n  userHswapOrders(owner: $wallet) {\n    ...ReducedHSwapPoolWithColl\n    __typename\n  }\n  userTcompBids(owner: $wallet) {\n    ...ReducedTCompBidWithColl\n    __typename\n  }\n  userPortfolioCollections(wallets: [$wallet]) {\n    slug\n    slugDisplay\n    name\n    imageUri\n    statsOverall {\n      floorPrice\n      numMints\n      __typename\n    }\n    sellRoyaltyFeeBPS\n    tokenStandard\n    listedCount\n    mintCount\n    bidCount\n    __typename\n  }\n  userPortfolioBids(wallets: [$wallet], filterOutOwn: true) {\n    ...ReducedMintBid\n    __typename\n  }\n}\n\nfragment ReducedInstrumentWithMints on InstrumentWithMints {\n  slug\n  slugDisplay\n  compressed\n  name\n  imageUri\n  statsOverall {\n    floorPrice\n    numMints\n    __typename\n  }\n  mintCount\n  sellRoyaltyFeeBPS\n  tokenStandard\n  mints {\n    ...ReducedMintWithColl\n    __typename\n  }\n  __typename\n}\n\nfragment ReducedMintWithColl on MintWithColl {\n  ...ReducedMint\n  collName\n  slug\n  slugDisplay\n  numMints\n  __typename\n}\n\nfragment ReducedMint on TLinkedTxMintTV2 {\n  onchainId\n  compressed\n  owner\n  name\n  imageUri\n  animationUri\n  metadataUri\n  metadataFetchedAt\n  sellRoyaltyFeeBPS\n  tokenStandard\n  tokenEdition\n  attributes\n  lastSale {\n    price\n    txAt\n    __typename\n  }\n  accState\n  ...MintRarityFields\n  __typename\n}\n\nfragment MintRarityFields on TLinkedTxMintTV2 {\n  rarityRankTT\n  rarityRankTTStat\n  rarityRankTTCustom\n  rarityRankHR\n  rarityRankTeam\n  rarityRankStat\n  rarityRankTN\n  __typename\n}\n\nfragment ReducedLinkedTxMintWithColl on LinkedTransactionMintWithColl {\n  tx {\n    ...ReducedParsedTx\n    __typename\n  }\n  mint {\n    ...ReducedMintWithColl\n    __typename\n  }\n  __typename\n}\n\nfragment ReducedParsedTx on ParsedTransaction {\n  source\n  txKey\n  txId\n  txType\n  grossAmount\n  sellerId\n  buyerId\n  txAt\n  blockNumber\n  txMetadata {\n    auctionHouse\n    urlId\n    sellerRef\n    tokenAcc\n    __typename\n  }\n  poolOnchainId\n  __typename\n}\n\nfragment ReducedTSwapPoolWithColl on TSwapPoolWithColl {\n  pool {\n    ...ReducedTSwapPool\n    __typename\n  }\n  slug\n  collName\n  floorPrice\n  numMints\n  __typename\n}\n\nfragment ReducedTSwapPool on TSwapPool {\n  address\n  ownerAddress\n  whitelistAddress\n  poolType\n  curveType\n  startingPrice\n  delta\n  mmCompoundFees\n  mmFeeBalance\n  mmFeeBps\n  takerSellCount\n  takerBuyCount\n  nftsHeld\n  solBalance\n  createdUnix\n  statsTakerSellCount\n  statsTakerBuyCount\n  statsAccumulatedMmProfit\n  margin\n  marginNr\n  lastTransactedAt\n  maxTakerSellCount\n  nftsForSale {\n    ...ReducedMint\n    __typename\n  }\n  __typename\n}\n\nfragment ReducedHSwapPoolWithColl on HSwapPoolWithColl {\n  pool {\n    ...ReducedHSwapPool\n    __typename\n  }\n  slug\n  collName\n  floorPrice\n  numMints\n  __typename\n}\n\nfragment ReducedHSwapPool on HSwapPool {\n  address\n  pairType\n  delta\n  curveType\n  baseSpotPrice\n  feeBps\n  mathCounter\n  assetReceiver\n  boxes {\n    address\n    vaultTokenAccount\n    mint {\n      ...ReducedMint\n      __typename\n    }\n    __typename\n  }\n  feeBalance\n  buyOrdersQuantity\n  fundsSolOrTokenBalance\n  createdAt\n  lastTransactedAt\n  __typename\n}\n\nfragment ReducedTCompBidWithColl on TCompBidWithColl {\n  bid {\n    ...ReducedTCompBid\n    __typename\n  }\n  marginNr\n  collInfo {\n    slug\n    name\n    floorPrice\n    numMints\n    __typename\n  }\n  __typename\n}\n\nfragment ReducedTCompBid on TCompBid {\n  address\n  target\n  targetId\n  field\n  fieldId\n  amount\n  solBalance\n  ownerAddress\n  filledQuantity\n  quantity\n  margin\n  marginNr\n  createdAt\n  __typename\n}\n\nfragment ReducedMintBid on MintBid {\n  mint {\n    slug\n    numMints\n    ...ReducedMint\n    __typename\n  }\n  bidder\n  margin\n  price\n  mp\n  validFrom\n  expiry\n  __typename\n}",
        },
      ]),
    })
      .then(async (response) => {
        if (response.ok) {
          return response.json() as Promise<any>;
        } else {
          throw new Error("Failed request getInventory");
        }
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

(async () => {
  const manyAccount: string = await question("Masukan lokasi akun :  ");

  const accountList = fs.readFileSync(manyAccount, "utf-8").split("\n");

  if (accountList.length < 1) {
    console.log(chalk.red(`Accounts tidak boleh kosong!`));
    process.exit(0);
  }
  console.log('')
  for (let index = 0; index < accountList.length; index++) {
    console.log("=======================================");
    console.log("");
    const requestId: string = generateRequestId(20);

    const element = accountList[index];
    const publicKey = element.split("|")[0];

    console.log(chalk.green('Check inventory account : '+publicKey))
    const tensorAccountDetail = await getInventory(requestId, publicKey);
    const inventoryData = tensorAccountDetail[0].data.inventoryBySlug;
    console.log(chalk.green('Sticker Pack Total ready on tensor : '+inventoryData.length))
    console.log(chalk.green('Sticker detail : \n'))
    inventoryData.map((dataPack: any, i: any) => {
      console.log(chalk.yellow(`${i+1}. ${dataPack.name.split('(')[0]}|${dataPack.mints.length} Sticker`));
    });
    console.log('')
  }
})();
