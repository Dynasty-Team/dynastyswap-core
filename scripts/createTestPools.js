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

async function createTestPool(name) {
  console.log('create LP pool ' + name)
  const signers = await ethers.getSigners()
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork()
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const tokenA = data.WVLX
  const tokenB = data[name]

  if (tokenA == tokenB) throw 'token names should be different'

  const DynastyFactory = await ethers.getContractAt('DynastyFactory', data.DynastyFactory)
  const PoolAddress = await DynastyFactory.createPair(tokenA, tokenB, { nonce, gasLimit: 9000000 })

  const result = await PoolAddress.wait(1)
  const event = result.events.find(x => x.event == 'PairCreated')

  save(chainId, 'VLX_' + name + '_LP', { pair: event.args.pair, tokenA, tokenB })
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

  const defaultTokens = admins.defaultTokens[chainId.toString()]

  for (var j = 0; j < defaultTokens.length; j++) {
    await createTestPool(defaultTokens[j])
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
