const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalBlock } = require('mineflayer-pathfinder').goals

const bot = mineflayer.createBot({
  host: 'localhost', // minecraft server ip
  username: 'Drinkopi', // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
  auth: 'offline', // for offline mode servers, you can set this to 'offline'
  port: 55555,              // set if you need a port that isn't 25565
  version: "1.20.1",           // only set if you need a specific version or snapshot (ie: "1.8.9" or "1.16.5"), otherwise it's set automatically
})

bot.loadPlugin(pathfinder)

bot.on('chat', async (username, message) => {
  if (username === bot.username) return

  const args = message.split(' ')
  if (args[0] !== 'mine') return

  const quantity = parseInt(args[1], 10)
  const blockType = args[2]

  if (isNaN(quantity) || !blockType) {
    bot.chat("Invalid command. Use 'mine <quantity> <blockType>'.")
    return
  }

  try {
    await mineBlocks(bot, blockType, quantity)
  } catch (err) {
    bot.chat(`Error: ${err.message}`)
    console.log(err)
  }
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)

/**
 * Instructs the bot to find and mine a specified number of blocks of a certain type.
 * @param {import('mineflayer').Bot} bot - The bot instance.
 * @param {string} blockType - The name of the block to mine.
 * @param {number} quantity - The number of blocks to mine.
 */
async function mineBlocks(bot, blockType, quantity) {
  // Announce the task
  bot.chat(`Starting to mine ${quantity} ${blockType}.`);

  // Find the first block to ensure it exists before starting the loop.
  const firstBlock = await bot.findBlock({
    matching: bot.mcdata.blocksByName[blockType]?.id,
    maxDistance: 128,
  });

  if (!firstBlock) {
    bot.chat(`Sorry, I can't find any ${blockType} nearby.`);
    return;
  }

  // A loop to mine the specified number of blocks.
  let mined = 0;
  while (mined < quantity) {
    // Find the next block to mine in each iteration.
    const target = await bot.findBlock({
      matching: bot.mcdata.blocksByName[blockType]?.id,
      maxDistance: 128,
    });

    // If no more blocks are found, stop the task.
    if (!target) {
      bot.chat(`Could not find any more ${blockType}. Mined ${mined} out of ${quantity}.`);
      return;
    }

    // Check if the bot has the required tool to mine the block efficiently.
    if (!bot.canDigBlock(target)) {
      bot.chat(`I cannot mine ${blockType}. I might be missing the right tool.`);
      return;
    }

    // Check if the inventory is full before mining.
    if (bot.inventory.emptySlotCount() === 0) {
      bot.chat('My inventory is full.');
      return;
    }

    // Navigate to the block's position using the pathfinder plugin.
    await bot.pathfinder.goto(new GoalBlock(target.position.x, target.position.y, target.position.z));

    // Dig the block.
    await bot.dig(target);
    mined++;
  }

  // Announce the completion of the task.
  bot.chat(`Finished mining ${quantity} ${blockType}.`);
}