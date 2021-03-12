// const { assert } = require("chai")
const _deploy_contracts = require("../migrations/2_deploy_contract")
const truffleAssert = require('truffle-assertions');

const RockPaperScissor = artifacts.require("RockPaperScissor");

contract('RockPaperScissor', (accounts) => {

    var rockPaperScissor;

    it('initializes contracts', async () => {
        rockPaperScissor = await RockPaperScissor.deployed()
        assert.notEqual(rockPaperScissor.address, 0x0, 'has contract address')
    })

    it('can get player count before player creates account', async () => {
        const count = await rockPaperScissor.get_player_count()

        assert.equal(count.toNumber(), 0, 'correct count was returned');
    })

    it('can create player', async () => {

        const register = await rockPaperScissor.register_player('danistone', {from: accounts[3]})

        truffleAssert.eventEmitted(register, 'OnPlayerCreated', (ev) => {
            assert.equal(ev.username, 'danistone', 'correct username was returned');
            assert.equal(ev.id, 1, 'correct id was returned');
            assert.equal(ev.player_address, accounts[3], 'correct address was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('cannot create player with same address', async () => {

        truffleAssert.reverts(
            rockPaperScissor.register_player('danistone', {from: accounts[3]}), 
            null,
            'player already exists'
        );
    })

    it('can get player', async () => {
        const player = await rockPaperScissor.get_player(accounts[3])

        assert.equal(player.username, 'danistone', 'correct username was returned');
        assert.equal(player.id, 1, 'correct id was returned');
        assert.equal(player.won_game_count, 0, 'won game count set to defualt of 0');
        assert.equal(player.lost_game_count, 0, 'lost game count set to defualt of 0');
        assert.equal(player.drawn_game_count, 0, 'drawn game count set to defualt of 0');
        assert.equal(player.state, 'idle', 'state set to defualt of idle');
    })

    it('can get player count after player creates account', async () => {
        const count = await rockPaperScissor.get_player_count()

        assert.equal(count.toNumber(), 1, 'correct count was returned');
    })

    it('cannot let player that doesnt exist search for game', async () => {
        truffleAssert.reverts(
            rockPaperScissor.search_game({from: accounts[5]}),
            null,
            'player does not exist'
        );
    })

    it('can let player search for game', async () => {

        const search = await rockPaperScissor.search_game({from: accounts[3]})

        truffleAssert.eventEmitted(search, 'OnEnterLobby', (ev) => {
            assert.equal(ev.player_address, accounts[3], 'correct address was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can turn player state to searching', async () => {

        const player = await rockPaperScissor.get_player(accounts[3])

        assert.equal(player.state, 'searching', 'state set to of searching');
    })

    it('cannot let player search for game when they are in the lobby already', async () => {

        truffleAssert.reverts(
            rockPaperScissor.search_game({from: accounts[3]}),
            null,
            'player already in lobby'
        );

        const player = await rockPaperScissor.get_player(accounts[3])
    })

    it('can let another player search for game and join', async () => {

        const register = await rockPaperScissor.register_player('samistone', {from: accounts[2]})

        const count = await rockPaperScissor.get_player_count()

        assert.equal(count.toNumber(), 2, 'correct count was returned');

        const search = await rockPaperScissor.search_game({from: accounts[2]})

        truffleAssert.eventEmitted(search, 'OnGameStarted', (ev) => {
            assert.equal(ev.player_1_address, accounts[3], 'correct address for player 1 was returned');
            assert.equal(ev.player_2_address, accounts[2], 'correct address for player 2 was returned');
            assert.equal(ev.state, 'playing', 'correct state was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can turn both players state to playing', async () => {

        const player1 = await rockPaperScissor.get_player(accounts[3])
        const player2 = await rockPaperScissor.get_player(accounts[2])

        assert.equal(player1.state, 'playing', 'player 1 state set to of playing');
        assert.equal(player2.state, 'playing', 'player 2 state set to of playing');
    })
})