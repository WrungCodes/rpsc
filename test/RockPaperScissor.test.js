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

    it('can let player play an option', async () => {

        const game = await rockPaperScissor.play('rock', {from: accounts[3]})
        const player = await rockPaperScissor.get_player(accounts[3])

        truffleAssert.eventEmitted(game, 'OnGamePlayed', (ev) => {
            assert.equal(accounts[3], ev.player_1, 'player 1 address correct');
            assert.equal(player.state, 'played', 'player 1 state changed to played');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can get current or last player game', async () => {

        const game1 = await rockPaperScissor.get_game({from: accounts[3]});
        const game2 = await rockPaperScissor.get_game({from: accounts[2]})

        assert.equal(accounts[3], game1.player_1, '');
        assert.equal(accounts[2], game2.player_2, '');

        assert.equal(game1.player_2_option, '****', '');
        assert.equal(game2.player_1_option, '****', '');
    })

    it('can let player 2 play an option', async () => {

        const game = await rockPaperScissor.play('paper', {from: accounts[2]})
        var player1 = await rockPaperScissor.get_player(accounts[3])
        var player2 = await rockPaperScissor.get_player(accounts[2])

        truffleAssert.eventEmitted(game, 'OnGameResult', (ev) => {
            assert.equal(accounts[2], ev.loser, 'player 2 address is loser');
            assert.equal(accounts[3], ev.winner, 'player 1 address is winner');
            
            assert.equal(player1.state, 'idle', 'player 2 state changed to idle');
            assert.equal(player2.state, 'idle', 'player 2 state changed to idle');

            assert.equal(player1.won_game_count, 1, 'player 1 win is added');
            assert.equal(player1.lost_game_count, 0, 'player 1 didnt lose');

            assert.equal(player2.won_game_count, 0, 'player 2 didnt win');
            assert.equal(player2.lost_game_count, 1, 'player 2 loss is added');

            return true;
        }, 'Contract should return the correct message.');

        const game_result_1 = await rockPaperScissor.get_game({from: accounts[3]});
        const game_result_2 = await rockPaperScissor.get_game({from: accounts[3]});
 
        assert.equal(game_result_1.state, game_result_2.state, '');
    })
})