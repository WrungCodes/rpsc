// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract RockPaperScissor is Context
{
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    Counters.Counter private _userIds;
    Counters.Counter private _gameIds;

    struct Player {
        uint256 id;
        string username;
        uint256 won_game_count;
        uint256 lost_game_count;
        uint256 drawn_game_count;
        string state;
    }

    struct Game {
        uint256 id;
        address player_1;
        address player_2;
        string state;
        string player_1_option;
        string player_2_option;
    }

    struct Result {
        uint256 game_id;
        address winner;
        address loser;
    }

    mapping(address => Player) public players;

    mapping(address => Game) public games;

    EnumerableSet.AddressSet private lobby;

    event OnGameStarted(uint256 id, address player_1_address, address player_2_address, string state);

    event OnEnterLobby(address player_address);

    event OnPlayerCreated(address player_address, uint256 id, string username);

    event OnGamePlayed(uint256 id, address player_1, address player_2);

    event OnGameResult(uint256 id, address winner, address loser, string player_1_option, string player_2_option);

    constructor()
    {

    }

   /**
     * creates a player obect and saves it to the 'players' map
     * initial value of the 'won_game_count', 'lost_game_count', 'drawn_game_count' is 0
     * defualt state is also set to 'idle'.
     * returns the player object
     */
    function register_player(string memory username) public
    {
        _userIds.increment();
        _create_user(_msgSender(), _userIds.current(), username);
    }

    function get_player(address user_address) public view returns (Player memory)
    {
        return players[user_address];
    }

    function get_game() public view returns (Game memory)
    {
        require(_game_exist(_msgSender()), 'no game exist');

        Game memory game = games[_msgSender()];
        if(!_compare_string(game.state, 'finished'))
        {
            _msgSender() == game.player_1 ? game.player_2_option = '****' : game.player_1_option = '****';
        }
        return game;
    }

    function get_player_count() public view returns (uint256)
    {
        return _userIds.current();
    }

    function search_game() public
    {
        require(_player_exist(_msgSender()), 'player does not exist');

        require(_player_is_idle(_msgSender()), 'player already in a game');

        lobby.length() == 0 ? 
            _insert_player_into_lobby(_msgSender()) : // add player to game lobby
            _add_players_to_game(_pop_player_from_lobby(), _msgSender()); // start game with the two addresses and remove them from the lobby
    }

    function play(string memory option) public
    {
        require(_player_exist(_msgSender()), 'player does not exist');

        require(_validate_options(option), 'invalid option given');

        require(_game_exist(_msgSender()), 'no game exist');

        require(_player_is_playing(_msgSender()), 'player is not in a game');

        address current_player_address = _msgSender();

        Game storage game_1 = games[current_player_address];

        address other_player_address = current_player_address == game_1.player_1 
            ? game_1.player_2 : game_1.player_1;

        Game storage game_2 = current_player_address == game_1.player_1 ?
            games[game_1.player_2] : games[game_1.player_1];

        require(_compare_string(current_player_address == game_1.player_1 ? game_1.player_1_option : game_1.player_2_option, ''), 'you have already played');

        current_player_address == game_1.player_1 ? game_1.player_1_option = option :  game_1.player_2_option = option;
        current_player_address == game_1.player_1 ? game_2.player_1_option = option :  game_2.player_2_option = option;

        Player storage current_player = players[current_player_address];
        current_player.state = 'played';

        Player storage other_player = players[other_player_address];

        if(!_compare_string(game_1.player_1_option, '') && !_compare_string(game_1.player_2_option, ''))
        {
            // both players have played, evaluate the winner
            Result memory result = Result(game_1.id, game_1.player_1, game_1.player_2);

            game_1.state = 'finished';
            game_2.state = 'finished';

            current_player.state = 'idle';
            other_player.state = 'idle';

            Player storage winner = players[result.winner];
            winner.won_game_count ++;

            Player storage loser = players[result.loser];
            loser.lost_game_count ++;

            emit OnGameResult(game_1.id, result.winner, result.loser, game_1.player_1_option, game_1.player_2_option);
        }
        else
        {
            emit OnGamePlayed(game_1.id, game_1.player_1, game_1.player_2);
        }
    }

   /**
     * creates a player obect and saves it to the 'players' map
     * initial value of the 'won_game_count', 'lost_game_count', 'drawn_game_count' is 0
     * defualt state is also set to 'idle'.
     * returns the player object
     */
    function _create_user(address user_address, uint256 user_id, string memory username) private returns (Player memory)
    {
        require(!_player_exist(user_address), 'player already exists');

        players[user_address] = Player(user_id, username, 0, 0, 0, 'idle');

        emit OnPlayerCreated(user_address, user_id, username);

        return players[user_address];
    }

    /**
    * check if the player game option either 'rock' 'paper' 'scissor'
    * returns true if it is any of them, return false if it isn't
    */
    function _validate_options(string memory option) private pure returns (bool)
    {
        if(
            !_compare_string(option, 'rock') 
            && !_compare_string(option, 'paper') 
            && !_compare_string(option, 'scissor')
        )
        {
            return false;
        }

        return true;
    }

    /**
    * check if the player exist since defualt string of an empty object is ''
    * returns true if player doessn't exist
    */
    function _player_exist(address value) private view returns (bool)
    {
        if(_compare_string(players[value].state, ''))
        {
            return false;
        }

        return true;
    }

    /**
    * check if the player exist since defualt string of an empty object is ''
    * returns true if player doessn't exist
    */
    function _game_exist(address value) private view returns (bool)
    {
        if(_compare_string(games[value].state, ''))
        {
            return false;
        }

        return true;
    }

    /**
    * create game for both players and store the game into the game array
    * raises event when game is started
    */
    function _add_players_to_game(address player1, address player2) private
    {
        games[player1] = Game(_gameIds.current(), player1, player2, 'playing', '', '');
        games[player2] = Game(_gameIds.current(), player1, player2, 'playing', '', '');

        Player storage player_1 = players[player1];
        player_1.state = 'playing';

        Player storage player_2 = players[player2];
        player_2.state = 'playing';

        emit OnGameStarted(_gameIds.current(), player1, player2, 'playing');
        _gameIds.increment();
    }

    /**
    * add a player into the game lobby
    * check if the user is already in the lobby
    */
    function _pop_player_from_lobby() private returns (address)
    {
        address match_address = lobby.at(0);
        lobby.remove(match_address);
        return match_address;
    }

    /**
    * add a player into the game lobby
    * check if the user is already in the lobby
    */
    function _insert_player_into_lobby(address value) private
    {
        require(!lobby.contains(value), 'player already in lobby');
        lobby.add(value);

        Player storage player = players[value];

        player.state = 'searching';

        emit OnEnterLobby(value);
    }

    /**
    * check if the player state is equals to 'idle'
    * returns true if player isn't idle
    */
    function _player_is_idle(address value) private view returns (bool)
    {
        if(_compare_string(players[value].state, 'idle'))
        {
            return true;
        }

        return false;
    }

    /**
    * check if the player state is equals to 'playing'
    * returns true if player isn't playing
    */
    function _player_is_playing(address value) private view returns (bool)
    {
        if(_compare_string(players[value].state, 'playing'))
        {
            return true;
        }

        return false;
    }

    /**
    * check if the player state is equals to 'idle'
    * returns true if player isn't idle
    */
    function _player_is_in_lobby(address value) private view returns (bool)
    {
        if(_compare_string(players[value].state, 'searching'))
        {
            return true;
        }

        return false;
    }

    /**
    * campare two string together
    * returns true if the strings are the same
    */
    function _compare_string(string memory a, string memory b) private pure returns (bool)
    {
        if(keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)))
        {
            return true;
        }

        return false;
    }
}