function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
async function sleep() {
  return await timeout(10000)
}

function save(chainId, name, value) {
  const fs = require('fs')

  const filename = '../dynasty-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {}

  data[name] = value

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))
}

async function createRealPool(address) {
  console.log('create LP pool ' + address)
  const signers = await ethers.getSigners()
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork()
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const tokenA = data.AdaToken
  const tokenB = address

  //console.log("DynastyFactory", data.DynastyFactory)

  if (tokenA == tokenB) throw 'token names should be different'

  const DynastyFactory = await ethers.getContractAt('DynastyFactory', data.DynastyFactory)
  const PoolAddress = await DynastyFactory.createPair(tokenA, tokenB, { nonce, gasLimit: 9000000 })

  const result = await PoolAddress.wait(1)
  const event = result.events.find(x => x.event == 'PairCreated')

  const Token = await ethers.getContractAt('PancakeERC20', address)

  const symbol = await Token.symbol()

  save(chainId, 'ADA_' + symbol + '_LP', { pair: event.args.pair, tokenA, tokenB })

  await sleep()

  return true
}

function get(chainId) {
  const fs = require('fs')

  const filename = '../dynasty-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {}

  return data
}

async function main() {
  const admins = JSON.parse(require('fs').readFileSync('../dynasty-addresses/admins.json', 'utf8'))

  const { chainId } = await ethers.provider.getNetwork()

  const data = get(chainId)

  await createRealPool(data.DynastyToken)

  const wrappedTokens = admins.wrappedTokens[chainId.toString()]

  for (var j = 0; j < wrappedTokens.length; j++) {
    await createRealPool(wrappedTokens[j])
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })