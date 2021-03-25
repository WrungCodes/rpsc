const RPSCToken = artifacts.require("RPSCToken");
const RockPaperScissor = artifacts.require("RockPaperScissor");

module.exports = function (deployer) {
  deployer.deploy(RPSCToken, 10000000000).then(function(){
    return deployer.deploy(RockPaperScissor, RPSCToken.address, 100);
  });
};
