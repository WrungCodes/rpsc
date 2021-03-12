const RPSCToken = artifacts.require("RPSCToken");
const RockPaperScissor = artifacts.require("RockPaperScissor");

module.exports = function (deployer) {
  deployer.deploy(RPSCToken);
  deployer.deploy(RockPaperScissor);
};
