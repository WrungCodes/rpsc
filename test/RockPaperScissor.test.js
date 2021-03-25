// const { assert } = require("chai")
const _deploy_contracts = require("../migrations/2_deploy_contract")
const truffleAssert = require('truffle-assertions');

const RockPaperScissor = artifacts.require("RockPaperScissor");
const RPSCToken = artifacts.require("RPSCToken");

contract('RockPaperScissor', (accounts) => {

    var rockPaperScissor;
    var token;

    var amountOfTokenCredited = 5000000000;

    const playeraccount1 = accounts[3];
    const playeraccount2 = accounts[2];
    const unknownplayeraccount = accounts[5];

    it('initializes contracts', async () => {
        rockPaperScissor = await RockPaperScissor.deployed()
        assert.notEqual(rockPaperScissor.address, 0x0, 'has contract address')
    })

    it('initializes token contracts', async () => {
        token = await RPSCToken.deployed()
        assert.notEqual(token.address, 0x0, 'token has contract address')

        // //send some token funds to conttract address
        payment = await token.transfer(rockPaperScissor.address, amountOfTokenCredited)
        
        balance = await token.balanceOf(rockPaperScissor.address);
        assert.equal(balance, 5000000000, 'token was transfered successfully');

        update = await rockPaperScissor.update_token_balance();
    })

    it('can get player count before player creates account', async () => {
        const count = await rockPaperScissor.get_player_count()

        assert.equal(count.toNumber(), 0, 'correct count was returned');
    })

    it('can create player', async () => {

        const register = await rockPaperScissor.register_player('danistone', {from: playeraccount1})

        truffleAssert.eventEmitted(register, 'OnPlayerCreated', (ev) => {
            assert.equal(ev.username, 'danistone', 'correct username was returned');
            assert.equal(ev.id, 1, 'correct id was returned');
            assert.equal(ev.player_address, playeraccount1, 'correct address was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('cannot create player with same address', async () => {

        truffleAssert.reverts(
            rockPaperScissor.register_player('danistone', {from: playeraccount1}), 
            null,
            'player already exists'
        );
    })

    it('can get player', async () => {
        const player = await rockPaperScissor.get_player(playeraccount1)

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
            rockPaperScissor.search_game({from: unknownplayeraccount}),
            null,
            'player does not exist'
        );
    })

    it('can let player search for game', async () => {

        const search = await rockPaperScissor.search_game({from: playeraccount1})

        truffleAssert.eventEmitted(search, 'OnEnterLobby', (ev) => {
            assert.equal(ev.player_address, playeraccount1, 'correct address was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can turn player state to searching', async () => {

        const player = await rockPaperScissor.get_player(playeraccount1)

        assert.equal(player.state, 'searching', 'state set to of searching');
    })

    it('cannot let player search for game when they are in the lobby already', async () => {

        truffleAssert.reverts(
            rockPaperScissor.search_game({from: playeraccount1}),
            null,
            'player already in lobby'
        );

        const player = await rockPaperScissor.get_player(playeraccount1)
    })

    it('can let another player search for game and join', async () => {

        const register = await rockPaperScissor.register_player('samistone', {from: playeraccount2})

        const count = await rockPaperScissor.get_player_count()

        assert.equal(count.toNumber(), 2, 'correct count was returned');

        const search = await rockPaperScissor.search_game({from: playeraccount2})

        truffleAssert.eventEmitted(search, 'OnGameStarted', (ev) => {
            assert.equal(ev.player_1_address, playeraccount1, 'correct address for player 1 was returned');
            assert.equal(ev.player_2_address, playeraccount2, 'correct address for player 2 was returned');
            assert.equal(ev.state, 'playing', 'correct state was returned');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can turn both players state to playing', async () => {

        const player1 = await rockPaperScissor.get_player(playeraccount1)
        const player2 = await rockPaperScissor.get_player(playeraccount2)

        assert.equal(player1.state, 'playing', 'player 1 state set to of playing');
        assert.equal(player2.state, 'playing', 'player 2 state set to of playing');
    })

    it('can let player play an option', async () => {

        const game = await rockPaperScissor.play('rock', {from: playeraccount1})
        const player = await rockPaperScissor.get_player(playeraccount1)

        truffleAssert.eventEmitted(game, 'OnGamePlayed', (ev) => {
            assert.equal(playeraccount1, ev.player_1, 'player 1 address correct');
            assert.equal(player.state, 'played', 'player 1 state changed to played');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can get current or last player game', async () => {

        const game1 = await rockPaperScissor.get_game({from: playeraccount1});
        const game2 = await rockPaperScissor.get_game({from: playeraccount2})

        assert.equal(playeraccount1, game1.player_1, '');
        assert.equal(playeraccount2, game2.player_2, '');

        assert.equal(game1.player_2_option, '****', '');
        assert.equal(game2.player_1_option, '****', '');
    })

    it('can let player 2 play an option', async () => {

        const game = await rockPaperScissor.play('scissor', {from: playeraccount2})
        var player1 = await rockPaperScissor.get_player(playeraccount1)
        var player2 = await rockPaperScissor.get_player(playeraccount2)

        truffleAssert.eventEmitted(game, 'OnGameResult', (ev) => {
            assert.equal(playeraccount2, ev.loser, 'player 2 address is loser');
            assert.equal(playeraccount1, ev.winner, 'player 1 address is winner');
            
            assert.equal(player1.state, 'idle', 'player 2 state changed to idle');
            assert.equal(player2.state, 'idle', 'player 2 state changed to idle');

            assert.equal(player1.won_game_count, 1, 'player 1 win is added');
            assert.equal(player1.lost_game_count, 0, 'player 1 didnt lose');

            assert.equal(player2.won_game_count, 0, 'player 2 didnt win');
            assert.equal(player2.lost_game_count, 1, 'player 2 loss is added');

            return true;
        }, 'Contract should return the correct message.');

        const game_result_1 = await rockPaperScissor.get_game({from: playeraccount1});
        const game_result_2 = await rockPaperScissor.get_game({from: playeraccount1});
 
        assert.equal(game_result_1.state, game_result_2.state, '');
    })

    it('can turn both players state to playing', async () => {

        const player1 = await rockPaperScissor.get_player(playeraccount1)
        const player2 = await rockPaperScissor.get_player(playeraccount2)

        assert.equal(player1.state, 'idle', 'player 1 state set to of playing');
        assert.equal(player2.state, 'idle', 'player 2 state set to of playing');
    })

    it('can let player search for game again', async () => {

        const search = await rockPaperScissor.search_game({from: playeraccount1})

        truffleAssert.eventEmitted(search, 'OnEnterLobby', (ev) => {
            assert.equal(ev.player_address, playeraccount1, 'correct address was returned');
            return true;
        }, 'Contract should return the correct message.');

        const player = await rockPaperScissor.get_player(playeraccount1)

        assert.equal(player.state, 'searching', 'state set to of searching');
    })

    it('can let another player search for game and join again', async () => {

        const search = await rockPaperScissor.search_game({from: playeraccount2})

        truffleAssert.eventEmitted(search, 'OnGameStarted', (ev) => {
            assert.equal(ev.player_1_address, playeraccount1, 'correct address for player 1 was returned');
            assert.equal(ev.player_2_address, playeraccount2, 'correct address for player 2 was returned');
            assert.equal(ev.state, 'playing', 'correct state was returned');
            return true;
        }, 'Contract should return the correct message.');

        const player = await rockPaperScissor.get_player(playeraccount2)

        assert.equal(player.state, 'playing', 'state set to of searching');
    })

    it('can let player play an option again', async () => {

        const game = await rockPaperScissor.play('rock', {from: playeraccount2})
        const player = await rockPaperScissor.get_player(playeraccount2)

        truffleAssert.eventEmitted(game, 'OnGamePlayed', (ev) => {
            assert.equal(player.state, 'played', 'player 1 state changed to played');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can let player 2 play an option again', async () => {

        const game = await rockPaperScissor.play('rock', {from: playeraccount1})
        const player = await rockPaperScissor.get_player(playeraccount1)

        truffleAssert.eventEmitted(game, 'OnGameDrawn', (ev) => {
            assert.equal(player.state, 'idle', 'player 1 state changed to played');
            return true;
        }, 'Contract should return the correct message.');
    })

    it('can get current player game history', async () => {

        const gh = await rockPaperScissor.get_player_history(playeraccount1);
        assert.equal(gh.count, 2, '');
    })

    it('can turn both players state to playing', async () => {

        const player1 = await rockPaperScissor.get_player(playeraccount1)
        const player2 = await rockPaperScissor.get_player(playeraccount2)

        assert.equal(player1.state, 'idle', 'player 1 state set to of playing');
        assert.equal(player2.state, 'idle', 'player 2 state set to of playing');
    })

    it('check both players token balances', async () => {

        const tokenBalanceTracker = await rockPaperScissor.tokenBalanceTracker()

        const player1tokenBalance = await token.balanceOf(playeraccount1);
        const player2tokenBalance = await token.balanceOf(playeraccount2);

        assert.equal(
            tokenBalanceTracker.toNumber() 
            + player1tokenBalance.toNumber() 
            + player2tokenBalance.toNumber(), amountOfTokenCredited, 'the token balances out');
    })
})