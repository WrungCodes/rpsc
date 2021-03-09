const RPSCToken = artifacts.require("RPSCToken");

module.exports = function (deployer) {
  deployer.deploy(RPSCToken);
};
