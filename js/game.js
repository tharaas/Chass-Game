/*
 	Thara AbuSaleh 
	Final Project 2022 - Chess Game
*/
var Chess = function(fen){

	var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';  // initial setup of the board
	
	var BLACK = 'b';
	var WHITE = 'w';
	var PAWN = 'p';
	var KNIGHT = 'n';
	var BISHOP = 'b';
	var ROOK = 'r';
	var QUEEN = 'q';
	var KING = 'k';
	var SYMBOLS = 'pnbrqkPNBRQK';
	var EMPTY = -1;
	var PAWN_OFFSETS = { b: [16, 32, 17, 15], w: [-16, -32, -17, -15],};
	var PIECE_OFFSETS = { n: [-18, -33, -31, -14, 18, 33, 31, 14], b: [-17, -15, 17, 15], r: [-16, 1, 16, -1], q: [-17, -16, -15, 1, 17, 16, 15, -1], k: [-17, -16, -15, 1, 17, 16, 15, -1],};
	var board = new Array(128);
	var kings = { w: EMPTY, b: EMPTY };
	var turn = WHITE;
	var castling = { w: 0, b: 0 };
	var ep_square = EMPTY;
	var half_moves = 0;
	var move_number = 1;
	var history = [];
	var header = {};
		
	var RANK_1 = 7;
	var RANK_2 = 6;
	var RANK_7 = 1;
	var RANK_8 = 0;

	var SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
	var FLAGS = { NORMAL: 'n', CAPTURE: 'c', BIG_PAWN: 'b', EP_CAPTURE: 'e', PROMOTION: 'p', KSIDE_CASTLE: 'k', QSIDE_CASTLE: 'q',};
	var BITS = { NORMAL: 1, CAPTURE: 2, BIG_PAWN: 4, EP_CAPTURE: 8, PROMOTION: 16, KSIDE_CASTLE: 32, QSIDE_CASTLE: 64,};

	var SQUARES = {
		a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
		a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
		a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
		a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
		a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
		a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
		a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
		a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
	};
	
	var ROOKS = { 	w: [{ square: SQUARES.a1, flag: BITS.QSIDE_CASTLE },{ square: SQUARES.h1, flag: BITS.KSIDE_CASTLE },],
					b: [{ square: SQUARES.a8, flag: BITS.QSIDE_CASTLE },{ square: SQUARES.h8, flag: BITS.KSIDE_CASTLE },], };
	
	if(typeof fen == 'undefined'){
		load(DEFAULT_POSITION);
	} else{  load(fen);  }

	function load(fen){
	
		var tokens = fen.split(/\s+/);
		var position = tokens[0];
		var square = 0;
	
		if( !validateFen(fen).valid ) return false;
		for( var i=0; i<position.length; i++ ){
			var piece = position.charAt(i);
	
			if( piece == '/'){
				square += 8;
			} else{ if( ('0123456789'.indexOf(piece)) != -1 ){
					square += parseInt(piece, 10);
				} else{
					var color = piece < 'a' ? WHITE : BLACK;
					put({ type: piece.toLowerCase(), color: color }, algebraic(square));
					square++;
				}
			}
		}
	
		turn = tokens[1];
		if( tokens[2].indexOf('K') > -1){
			castling.w |= BITS.KSIDE_CASTLE;
		}
		if( tokens[2].indexOf('Q') > -1){
			castling.w |= BITS.QSIDE_CASTLE;
		}
		if( tokens[2].indexOf('k') > -1){
			castling.b |= BITS.KSIDE_CASTLE;
		}
		if( tokens[2].indexOf('q') > -1){
			castling.b |= BITS.QSIDE_CASTLE;
		}
	
		ep_square = tokens[3] === '-' ? EMPTY : SQUARES[tokens[3]];
		half_moves = parseInt(tokens[4], 10);
		move_number = parseInt(tokens[5], 10);
	
		updateSetup(generateFen());
		return true;
	}

	function swapColor(c){
		return c==WHITE ? BLACK : WHITE;
	}
	
	function reset(){  // reset the game to default position
		load(DEFAULT_POSITION);
	}	

	function generateFen(){   // create the board and initiate the game
		var empty = 0;
		var fen = '';
	
		for( var i=SQUARES.a8; i<=SQUARES.h1; i++){
			if( board[i]==null ){
				empty++;
			} else{
					if( empty>0 ){
						fen += empty;
						empty = 0;
					}
					var color = board[i].color;
					var piece = board[i].type;	
					fen += color == WHITE ? piece.toUpperCase() : piece.toLowerCase();
				}
	
			if( (i + 1) & 0x88){
				if( empty>0 ){
					fen += empty;
				}
	
				if( i!=SQUARES.h1 ){
					fen += '/';
				}
				empty = 0;
				i += 8;
			}
		}
	
		var cflags = '';
		if( castling[WHITE] & BITS.KSIDE_CASTLE )  	cflags += 'K';
		if( castling[WHITE] & BITS.QSIDE_CASTLE )  	cflags += 'Q';
		if( castling[BLACK] & BITS.KSIDE_CASTLE )	cflags += 'k';
		if( castling[BLACK] & BITS.QSIDE_CASTLE )	cflags += 'q';
		cflags = cflags || '-';
		var epflags = ep_square === EMPTY ? '-' : algebraic(ep_square);
		return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
	}

	function validateFen(fen){  // check if the fen is valid
		var errors = {
			0: 'No errors.',
			1: 'FEN string must contain six space-delimited fields.',
			2: '6th field (move number) must be a positive integer.',
			3: '5th field (half move counter) must be a non-negative integer.',
			4: '4th field (en-passant square) is invalid.',
			5: '3rd field (castling availability) is invalid.',
			6: '2nd field (side to move) is invalid.',
			7: "1st field (piece positions) does not contain 8 '/'-delimited rows.",
			8: '1st field (piece positions) is invalid [consecutive numbers].',
			9: '1st field (piece positions) is invalid [invalid piece].',
			10: '1st field (piece positions) is invalid [row too large].',
			11: 'Illegal en-passant square',
		};
	
		var tokens = fen.split(/\s+/);
		if( tokens.length != 6){ 	return { valid: false, error_number: 1, error: errors[1] }; }                                  
		if( isNaN(tokens[5]) || parseInt(tokens[5], 10) <= 0){   
			return { valid: false, error_number: 2, error: errors[2] };
		}
		if( isNaN(tokens[4]) || parseInt(tokens[4], 10) < 0){      	
			return { valid: false, error_number: 3, error: errors[3] };
		}
		if( !/^(-|[abcdefgh][36])$/.test(tokens[3])){                
			return { valid: false, error_number: 4, error: errors[4] };
		}
		if( !/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])){           	          
			return { valid: false, error_number: 5, error: errors[5] };
		}
		if( !/^(w|b)$/.test(tokens[1])){                      
			return { valid: false, error_number: 6, error: errors[6] };
		}
	
		var rows = tokens[0].split('/')
		if( rows.length != 8 ){                               
			return { valid: false, error_number: 7, error: errors[7] };
		}
		for( var i=0; i<rows.length; i++){                       	  /* every row is valid */
			var sFields = 0;
			var previousNumber = false;
	
			for( var k=0; k<rows[i].length; k++){                     /* check for right sum of fields AND not two numbers consecutivly */
				if( !isNaN(rows[i][k]) ){
					if(previousNumber){
						return { valid: false, error_number: 8, error: errors[8] };
					}
					sFields += parseInt(rows[i][k], 10);
					previousNumber = true;
				} else{
					if( !/^[prnbqkPRNBQK]$/.test(rows[i][k]) ){
						return { valid: false, error_number: 9, error: errors[9] };
					}
					sFields += 1;
					previousNumber = false;
				}
				}
				if( sFields != 8){
					return { valid: false, error_number: 10, error: errors[10] };
			}
		}
	
		if( (tokens[3][1] == '3' && tokens[1] == 'w') || (tokens[3][1] == '6' && tokens[1] == 'b') ){
			return { valid: false, error_number: 11, error: errors[11] };
		}

		return { valid: true, error_number: 0, error: errors[0] };
	} 

	function updateSetup(fen){
		if( history.length>0 ) return ;
	
		if( fen!=DEFAULT_POSITION ){
			header['SetUp'] = '1';
			header['FEN'] = fen;
		} else{
				delete header['SetUp'];
				delete header['FEN'];
			}
	}
	
	function get(square){
		return board[SQUARES[square]] ? { type: piece.type, color: piece.color } : null;
	}
		
	function remove(square){
		var piece = get(square);
		board[SQUARES[square]] = null;
		if(piece && piece.type == KING){
			kings[piece.color] = EMPTY;
		}
		updateSetup(generateFen());
		return piece;
	}

	function put(piece, square){    
		if(!('type' in piece && 'color' in piece))	return false;               /* check for valid piece */
		if(SYMBOLS.indexOf(piece.type.toLowerCase()) == -1 )	return false;   /* check for piece */
		if(!(square in SQUARES))	return false;                               /* check for valid square */
		if( piece.type == KING && !(kings[piece.color] == EMPTY || kings[piece.color] == SQUARES[square]) )	return false;   	  /* don't let the user place more than one king */
		board[SQUARES[square]] = { type: piece.type, color: piece.color };
		if( piece.type==KING )	kings[piece.color] = SQUARES[square];
		updateSetup(generateFen());
		return true;
	}

	function bulMove(board, from, to, flags, promotion){
		var move = { color: turn, from: from, to: to, flags: flags, piece: board[from].type, };
		if(promotion){
			move.flags |= BITS.PROMOTION;
			move.promotion = promotion;
		}
		if(board[to]){
			move.captured = board[to].type;
		} else if(flags & BITS.EP_CAPTURE){
			move.captured = PAWN;
		}
		return move;
	}
	
	function generateMoves(options){
		function addMove(board, moves, from, to, flags) {
			if( board[from].type == PAWN && (rank(to) == RANK_8 || rank(to) == RANK_1) ){
				var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
				for( var i=0, len=pieces.length; i<len; i++ ){
					moves.push(bulMove(board, from, to, flags, pieces[i]));
				}
			} else{
				moves.push(bulMove(board, from, to, flags));
			}
		}
	
		var moves = [];
		var us = turn;
		var them = swapColor(us);
		var second_rank = { b: RANK_7, w: RANK_2 };
		var first_sq = SQUARES.a8;
		var last_sq = SQUARES.h1;
		var single_square = false;
	
		var legal = typeof options !== 'undefined' && 'legal' in options ? options.legal : true;
		var piece_type = typeof options !== 'undefined' && 'piece' in options && typeof options.piece === 'string' ? options.piece.toLowerCase() : true;
	
		if( typeof options != 'undefined' && 'square' in options){
			if( options.square in SQUARES ){
				first_sq = last_sq = SQUARES[options.square];
				single_square = true;
			} else{
				return [];
			}
		}
	
		for( var i=first_sq; i<=last_sq; i++){
			if(i & 0x88){ 		/* did we proceed beyond the end of the board */
				i += 7;
				continue;
			}
			var piece = board[i];
			if( piece==null || piece.color!=us ){
				continue;
			}
	
			if( piece.type==PAWN && (piece_type==true || piece_type==PAWN) ){     /* single square, non-capturing */
				var square = i+PAWN_OFFSETS[us][0]  ;
				if( board[square]==null ){
					addMove(board, moves, i, square, BITS.NORMAL);
					var square = i+PAWN_OFFSETS[us][1];           /* double square */
					if( second_rank[us]==rank(i) && board[square] == null ){
						addMove(board, moves, i, square, BITS.BIG_PAWN);
					}
				}
				for( j=2; j<4 ; j++){                    /* pawn captures */
					var square = i+PAWN_OFFSETS[us][j];
					if( square & 0x88 ) continue;
					if( board[square]!=null && board[square].color==them ){
						addMove(board, moves, i, square, BITS.CAPTURE);
					} else if( square==ep_square ){
						addMove(board, moves, i, ep_square, BITS.EP_CAPTURE);
					}
				}
			} else if( piece_type==true || piece_type==piece.type ){
					for( var j=0, len=PIECE_OFFSETS[piece.type].length; j<len; j++ ){
						var offset = PIECE_OFFSETS[piece.type][j];
						var square = i;
						while(true){
							square += offset;
							if( square & 0x88 ) break;
							if( board[square]==null ){
								addMove(board, moves, i, square, BITS.NORMAL);
							} else{ if( board[square].color==us ) break
									addMove(board, moves, i, square, BITS.CAPTURE);
									break;
								}
							if( piece.type=='n' || piece.type=='k') break;
						}
					}
				}
		}
	// Castling - Hatsraha
		if(piece_type == true || piece_type == KING){
			if(!single_square || last_sq == kings[us]){  /* castling: the king-side */
				if(castling[us] & BITS.KSIDE_CASTLE){
					var castling_from = kings[us];
					var castling_to = castling_from+2;
					if( board[castling_from + 1] == null && board[castling_to] == null && !attacked(them, kings[us]) && !attacked(them, castling_from + 1) && !attacked(them, castling_to)) {
						addMove(board, moves, kings[us], castling_to, BITS.KSIDE_CASTLE);
					}
				}
				if(castling[us] & BITS.QSIDE_CASTLE){  /* castling: the queen-side */
					var castling_from = kings[us];
					var castling_to = castling_from-2;
					if( board[castling_from - 1] == null && board[castling_from - 2] == null && board[castling_from - 3] == null && !attacked(them, kings[us]) && !attacked(them, castling_from - 1) && !attacked(them, castling_to)) {
						addMove(board, moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
					}
				}
			}
		}
		if(!legal) return moves;   /* return all pseudo-legal moves (including moves that allow the king to be captured) */
	
		var legal_moves = [];
		for (var i = 0, len = moves.length; i < len; i++) {  /* filtering out illegal moves */
			makeMove(moves[i]);
				if(!kingAttacked(us)){
					legal_moves.push(moves[i]);
				}
			undoMove();
		}
		return legal_moves;
	}
	
	function attacked(color, square){
		for( var i=SQUARES.a8; i<=SQUARES.h1; i++){
			if(i & 0x88){
				i+=7;
				continue;
			}
			if(board[i]==null || board[i].color!=color) continue;
		
			var piece = board[i];
			var difference = i-square;
			var index = difference+119;
		
			if( ATTACKS[index] & (1 << SHIFTS[piece.type])){
				if( piece.type==PAWN ){
					if(difference>0){
						if(piece.color==WHITE) return true;
					} else {	if(piece.color==BLACK) return true;  }
					continue;
				}
		
				if(piece.type=='n' || piece.type=='k') return true;
				var offset = RAYS[index];
				var j = i+offset;
				var blocked = false;
				while( j!=square){
					if( board[j]!=null ){
						blocked = true;
						break;
					}
					j += offset;
				}
				if(!blocked) return true;
			}
		}
		return false;
	}
	
	function kingAttacked(color){
		return attacked(swapColor(color), kings[color]);
	}
	
	function inCheckmate(){
		return kingAttacked(turn) && generateMoves().length==0;
	}
	
	function inStalemate(){ //draw
		return !kingAttacked(turn) && generateMoves().length==0;
	}

	function moveSan(move, moves){   //save the moves in SAN
		var output = '';
	
		if( move.flags & BITS.KSIDE_CASTLE ){
			output = 'O-O';
		} else if( move.flags & BITS.QSIDE_CASTLE ){
			output = 'O-O-O';
		} else {	if( move.piece!=PAWN ){
						var disambiguator = getDisam(move, moves);
						output += move.piece.toUpperCase() + disambiguator;
					}
					if( move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE) ){
						if( move.piece==PAWN ){
							output += algebraic(move.from)[0];
						}
						output += 'x';
					}
					output += algebraic(move.to);
			
					if( move.flags & BITS.PROMOTION ){
						output += '=' + move.promotion.toUpperCase();
					}
			}
		makeMove(move);
		if(kingAttacked(turn)){
			if(inCheckmate()){
				output+='#';
			} else{
				output+='+';
			}
		}
		undoMove();
		return output;
	}

	function strippedSan(move){  // parses all of the decorators out of a SAN string
		return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
	}
	
	var ATTACKS = [
		20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20, 0,
		0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
		0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
		0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
		0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
		24,24,24,24,24,24,56,  0, 56,24,24,24,24,24,24, 0,
		0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
		0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
		0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
		0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
		20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20
	];

	var RAYS = [
		17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
		0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
		0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
		0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
		0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
		0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
		0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
		1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
		0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
		0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
		0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
		0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
		0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
		0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
		-15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17
	];
	
	function insufficientMaterial(){  //peces is not inof
		var pieces = {};
		var bishops = [];
		var num_pieces = 0;
		var sq_color = 0;
	
		for( var i = SQUARES.a8; i<=SQUARES.h1; i++ ){
			sq_color = (sq_color+1)%2;
			if( i & 0x88){
				i += 7;
				continue;
			}
			var piece = board[i];
			if(piece){
				pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
				if( piece.type==BISHOP ){
					bishops.push(sq_color);
				}
				num_pieces++;
			}
		}
		if( num_pieces==2 ){ 	  /* k vs. k */
			return true;
		} else if( num_pieces==3 && (pieces[BISHOP] == 1 || pieces[KNIGHT] == 1)){  /* k vs. kn .... or .... k vs. kb */
			return true;
		} else if( num_pieces==pieces[BISHOP]+2){   /* kb vs. kb where any number of bishops are all on the same color */
					var sum = 0;
					var len = bishops.length;
					for( var i=0; i<len; i++){
						sum += bishops[i];
					}
					if( sum==0 || sum==len){
						return true;
					}
				}
		return false;
	}
	
	function inThreefoldRepetition(){   //if the are a repet (if I need it?)
		var moves = [];
		var positions = {};
		var repetition = false;
	
		while(true){
			var move = undoMove();
			if(!move) break;
			moves.push(move);
		}
		while(true){
			var fen = generateFen().split(' ').slice(0, 4).join(' ');
			positions[fen] = fen in positions ? positions[fen] + 1 : 1;

			if( positions[fen]>=3 ) repetition = true;
			if(!moves.length) break;
			makeMove(moves.pop());
		}
		return repetition;
	}
	
	function push(move){
		history.push({
			move: move,
			kings: { b: kings.b, w: kings.w },
			turn: turn,
			castling: { b: castling.b, w: castling.w },
			ep_square: ep_square,
			half_moves: half_moves,
			move_number: move_number,
		});
	}
	
	function makeMove(move){
		var us = turn;
		var them = swapColor(us);
		push(move);
		board[move.to] = board[move.from];
		board[move.from] = null;

		if( move.flags & BITS.EP_CAPTURE ){ /* if ep capture, remove the captured pawn */
			if( turn==BLACK ){
				board[move.to-16]=null;
			} else {
				board[move.to+16]=null;
			}
		}
		if( move.flags & BITS.PROMOTION ){  /* if pawn promotion, replace with new piece */
			board[move.to] = { type: move.promotion, color: us };
		}
	
		if( board[move.to].type==KING){  /* if we moved the king */
			kings[board[move.to].color] = move.to;
			if( move.flags & BITS.KSIDE_CASTLE ){  /* if we castled, move the rook next to the king */
				var castling_to = move.to - 1;
				var castling_from = move.to + 1;
				board[castling_to] = board[castling_from];
				board[castling_from] = null;
			} else{ if( move.flags & BITS.QSIDE_CASTLE ){
						var castling_to = move.to + 1;
						var castling_from = move.to - 2;
						board[castling_to] = board[castling_from];
						board[castling_from] = null;
					}
				}

			castling[us] = '';    /* turn off castling */
		}
	
		if(castling[us]){       /* turn off castling if we move a rook */
			for( var i=0, len=ROOKS[us].length; i<len; i++){
				if( move.from == ROOKS[us][i].square && castling[us] & ROOKS[us][i].flag ){
					castling[us] ^= ROOKS[us][i].flag;
					break;
				}
			}
		}
		if(castling[them]){   	  /* turn off castling if we capture a rook */
			for( var i=0, len=ROOKS[them].length; i<len; i++){
				if( move.to == ROOKS[them][i].square && castling[them] & ROOKS[them][i].flag ){
					castling[them] ^= ROOKS[them][i].flag;
					break;
				}
			}
		}
		if(move.flags & BITS.BIG_PAWN){  /* if big pawn move, update the en passant square */
			if(turn=='b'){
				ep_square = move.to-16;
			} else {
				ep_square = move.to+16;
			}
		} else {
				ep_square = EMPTY;
			}
	
		if(move.piece==PAWN){    	  /* reset the 50 move counter if a pawn is moved or a piece is captured */
			half_moves = 0;
		} else if( move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)){
			half_moves = 0;
		} else {
			half_moves++;
		}
	
		if( turn==BLACK ) move_number++;
			
		turn = swapColor(turn);
	}
	
	function undoMove(){
		var old = history.pop();
		if(old==null)	return null;
	
		var move = old.move;
		kings = old.kings;
		turn = old.turn;
		castling = old.castling;
		ep_square = old.ep_square;
		half_moves = old.half_moves;
		move_number = old.move_number;
	
		var us = turn;
		var them = swapColor(turn);
		board[move.from] = board[move.to];
		board[move.from].type = move.piece; // to undo any promotions
		board[move.to] = null;
	
		if( move.flags & BITS.CAPTURE ){
			board[move.to] = { type: move.captured, color: them };
		} else{	if( move.flags & BITS.EP_CAPTURE ){
					var index;
					if(us==BLACK){
						index = move.to-16;
					} else{
						index = move.to+16;
					}
					board[index] = { type: PAWN, color: them };
				}
			}
		if( move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)){
			var castling_to, castling_from;
			if( move.flags & BITS.KSIDE_CASTLE ){
				castling_to = move.to+1;
				castling_from = move.to-1;
			} else if( move.flags & BITS.QSIDE_CASTLE ){
				castling_to = move.to-2;
				castling_from = move.to+1;
			}
	
			board[castling_to] = board[castling_from];
			board[castling_from] = null;
		}
		return move;
	}
	
	function getDisam(move, moves){ 
		var from = move.from;
		var to = move.to;
		var piece = move.piece;
		var ambiguities = 0;
		var same_rank = 0;
		var same_file = 0;
	
		for(var i=0, len=moves.length; i<len; i++){
			var ambig_from = moves[i].from;
			var ambig_to = moves[i].to;
			var ambig_piece = moves[i].piece;
	
			/* if a move of the same piece type ends on the same to square, we'll need to add a disambiguator to the algebraic notation */
			if( piece==ambig_piece && from!=ambig_from && to==ambig_to ){
				ambiguities++;
				if(rank(from)==rank(ambig_from))  same_rank++;
				if(file(from)==file(ambig_from))  same_file++;
			}
		}
		if(ambiguities>0){  /* if there exists a similar moving piece on the same rank and file as the move in question, use the square as the disambiguator*/
			if( same_rank>0 && same_file>0 ){
				return algebraic(from);
			} else if(same_file>0){  /* if the moving piece rests on the same file, use the rank symbol as the disambiguator */
					return algebraic(from).charAt(1);
				} else{   /* else use the file symbol */
						return algebraic(from).charAt(0);
					}
		}
		return '';
	}
	
	function inferPieceType(san){
		var pieceType = san.charAt(0);
		if(pieceType >= 'a' && pieceType <= 'h'){
			var matches = san.match(/[a-h]\d.*[a-h]\d/);
			if(matches){
				return undefined;
			}
			return PAWN;
		}
		pieceType = pieceType.toLowerCase();
		if(pieceType=='o'){
			return KING;
		}
		return pieceType;
	}
	
	function move_from_san(move, sloppy){  // convert a move from SAN to 0x88 coordinates
		var clean_move = strippedSan(move);   // take off any move decorations: e.g Nf3+?! becomes Nf3
		var overly_disambiguated = false;
		if(sloppy){
			var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
			if(matches){
				var piece = matches[1];
				var from = matches[2];
				var to = matches[3];
				var promotion = matches[4];
				if(from.length == 1){
					overly_disambiguated = true;
				}
			} else {
				var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
				if(matches){
					var piece = matches[1];
					var from = matches[2];
					var to = matches[3];
					var promotion = matches[4];
					if(from.length==1){
						overly_disambiguated = true;
					}
				}
			}
		}
		var piece_type = inferPieceType(clean_move);
		var moves = generateMoves({ legal: true, piece: piece ? piece : piece_type,});
		for(var i=0, len=moves.length; i<len; i++){ // try the strict parser first, then the sloppy parser if requested by the user
			if(clean_move==strippedSan(moveSan(moves[i], moves))){
				return moves[i];
			} else{ if(sloppy && matches){  // hand-compare move properties with the results from our sloppy regex
						if( (!piece || piece.toLowerCase() == moves[i].piece) && SQUARES[from] == moves[i].from && SQUARES[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
							return moves[i];
						} else if(overly_disambiguated){
								var square = algebraic(moves[i].from);
								if((!piece || piece.toLowerCase() == moves[i].piece) && SQUARES[to] == moves[i].to && (from == square[0] || from == square[1]) &&(!promotion || promotion.toLowerCase() == moves[i].promotion)){
									return moves[i];
								}
							}
					}
				}
		}
		return null;
	}

	function rank(i){ 
		return i >> 4; 
	}
	
	function file(i){
		return i & 15;
	}
	
	function algebraic(i){
		var f = file(i);
		var r = rank(i);
		return 'abcdefgh'.substring(f, f+1) + '87654321'.substring(r, r+1);
	}
	
	function makePr(ugly_move){  
		var move = clone(ugly_move);
		move.san = moveSan(move, generateMoves({ legal: true }));
		move.to = algebraic(move.to);
		move.from = algebraic(move.from);
		var flags = '';
	
		for(var flag in BITS){
			if(BITS[flag] & move.flags){
				flags += FLAGS[flag];
			}
		}
		move.flags = flags;
		return move;
	}
	
	function clone(obj){
		var dupe = obj instanceof Array ? [] : {};
	
		for(var property in obj){
			if(typeof property=='object'){
				dupe[property] = clone(obj[property]);
			} else{
				dupe[property] = obj[property];
			}
		}
		return dupe;
	}
  
	return{
		WHITE: WHITE, BLACK: BLACK,
		PAWN: PAWN, KNIGHT: KNIGHT, BISHOP: BISHOP,
		ROOK: ROOK, QUEEN: QUEEN, KING: KING,
	  	SQUARES: (function () {
			var keys = [];
			for(var i=SQUARES.a8; i<=SQUARES.h1; i++){
				if(i & 0x88){
					i += 7;
					continue;
				}
				keys.push(algebraic(i));
			}
			return keys;
	  	})(),
	  	FLAGS: FLAGS,
	  	load: function(fen){ return load(fen); },
  		reset: function(){ return reset(); },
  		moves: function(options){
			var ugly_moves = generateMoves(options);
			var moves = [];
  			for(var i=0, len=ugly_moves.length; i<len; i++){
				/* does the user want a full move object (most likely not), or just SAN */
		  		if(typeof options!='undefined' && 'verbose' in options && options.verbose ){
					moves.push(makePr(ugly_moves[i]));
		  		} else{
					moves.push(moveSan(ugly_moves[i], generateMoves({ legal: true })));
		  		}
			}
			return moves;
	  	},
  		inCheck: function(){ return kingAttacked(turn);},
  		inCheckmate: function(){ return inCheckmate();},
		inStalemate: function(){ return inStalemate();},
  		in_draw: function(){ return( half_moves>=100||inStalemate()||insufficientMaterial()||inThreefoldRepetition());},
		insufficientMaterial: function(){ return insufficientMaterial(); },
  		inThreefoldRepetition: function(){ return inThreefoldRepetition(); },
   		game_over: function(){ return(half_moves>=100 ||inCheckmate() || inStalemate() || insufficientMaterial() || inThreefoldRepetition());},
  		validateFen: function(fen){ return validateFen(fen);},
  		fen: function(){ return generateFen(); },
  		board: function(){
			var output = [],
			row = [];
			for(var i=SQUARES.a8; i<=SQUARES.h1; i++){
				if(board[i]==null){
					row.push(null);
				} else{
					row.push({ type: board[i].type, color: board[i].color });
				}
				if(( i+1) & 0x88){
					output.push(row);
					row = [];
					i += 8;
				}
			}
			return output;
	  	},
		turn: function(){ return turn; },
		move: function(move, options){
			var sloppy = (typeof options!='undefined' && 'sloppy' in options)? options.sloppy : false;
			var move_obj = null;
			if(typeof move=='string'){
				move_obj = move_from_san(move, sloppy);
			} else if(typeof move=='object'){
						var moves = generateMoves();
						for (var i=0, len=moves.length; i<len; i++) {  /* convert the pretty move object to an ugly move object */
							if(move.from == algebraic(moves[i].from) && move.to == algebraic(moves[i].to) && (!('promotion' in moves[i]) || move.promotion == moves[i].promotion)){
								move_obj = moves[i];
								break;
							}
						}
					}
			if(!move_obj){  /* failed to find move */
				return null;
			}
			var pretty_move = makePr(move_obj);  /* need to make a copy of move because we can't generate SAN after the move is made*/
			makeMove(move_obj);
			return pretty_move;
		},
		undo: function(){ 
			var move = undoMove();
			return move ? makePr(move) : null;
		},
		put: function(piece, square){ return put(piece, square); },
		get: function(square){ return get(square); },
		remove: function(square){return remove(square); },
		perft: function(depth){ return perft(depth); },
		square_color: function(square){
			if(square in SQUARES){
				var sq_0x88 = SQUARES[square];
				return (rank(sq_0x88) + file(sq_0x88)) % 2 === 0 ? 'light' : 'dark';
			}
			return null;
		},
		history: function(options){
			var reversed_history = [];
			var move_history = [];
			var verbose = ( typeof options != 'undefined' && 'verbose' in options &&options.verbose );
			while(history.length > 0){
				reversed_history.push(undoMove());
			}
			while(reversed_history.length > 0){
				var move = reversed_history.pop();
				if(verbose){
					move_history.push(makePr(move));
				} else{
					move_history.push(moveSan(move, generateMoves({ legal: true })));
				}
				makeMove(move);
			}
			return move_history;
		},
	}
}
  	
var chessGame = new Chess();
var theMove = null;

document.addEventListener("DOMContentLoaded" , ()=>{   //the game & the buttons on the left side

	intializeChessGrid();
	document.querySelector(".undo").addEventListener('click',()=>{
		if( chessGame.turn()=='w' ){
			chessGame.undo();
			chessGame.undo();
			intializeChessGrid();
		}
	})
	document.querySelector(".restart").addEventListener('click',()=>{
		chessGame = new Chess();
		intializeChessGrid();
	})
})

const intializeChessGrid =() =>{    //the board
	let divHeight = Math.floor(0.1 * Math.min(window.innerHeight , window.innerWidth));
	let board = chessGame.board();
	let mainDiv = document.querySelector("game");
	document.querySelector(".buttons").style.width = `${divHeight*8}px`;
	mainDiv.innerHTML = "";
	mainDiv.style.width = `${divHeight*8}px`;
	mainDiv.style.height = `${divHeight*8}px`;

	for(let i=0 ; i<64 ; i++){

		let divElement = document.createElement("div");
		divElement.style.height = `${divHeight}px`;

		if( (i + ( Math.floor(i/8)%2 ) ) % 2 == 1 )  //the black square
			divElement.style.backgroundColor = "DarkCyan";

		divElement.id = `${String.fromCharCode(97+i%8)}${8-Math.floor(i/8)}`;
		let piece = board[Math.floor(i/8)][i%8];
		
		divElement.setAttribute("onclick","showPossibleMoves(this)"); //Possible Moves
		if(piece != null){
			divElement.style.cursor = "pointer";
			divElement.innerHTML = `<img src="img/${piece.type}${piece.color}.png" >`;
		}
		mainDiv.append(divElement);
	}
}

const showPossibleMoves =(element) =>{
	if( theMove==null ){
		let possibleMoves =  chessGame.moves({verbose:true}).filter(({from}) => from == element.id);
		possibleMoves.forEach( m => { document.getElementById(m.to).classList.add("square") });			
		theMove  = possibleMoves;		
	}
	else{
		let move = theMove.filter(({to})=> to == element.id);
		if( move.length==0 ){
			theMove.forEach( m => {
				document.getElementById(m.to).classList.remove("square");
			}) 
			theMove = null;
			showPossibleMoves(element);
		}else{
			chessGame.move(move[0]);
			intializeChessGrid();
			theMove = null;

			if(!checkGameOver())   setTimeout(playBot , 100);
		}
	}
}

const checkGameOver =() =>{
	if(chessGame.game_over()){
		if(chessGame.inStalemate())	
			swal("Draw", "Stalement");
		else if( chessGame.inThreefoldRepetition() )
			swal("Draw","Threefold Repetition");
		else if( chessGame.in_draw() )
			swal("Draw"," 50-move rule or insufficient material idk");
		else if( chessGame.inCheckmate()){

			if( chessGame.turn()=='b' ){
				swal("Win","white won");
			}
			if( chessGame.turn()=='w' ){
				swal("Lose","Black wins");
			}
		}
		return true;
	}
	return false;
}

const playBot =async() =>{
	if( chessGame.turn()=='b'){
		let bestMove = findBestMoveAlphaBeta(chessGame);
		chessGame.move(bestMove);
		intializeChessGrid();
	}
}

const score =(board) =>{
	let pieceScore={ 'p':1 ,'n':3, 'b':3 , 'r':5 ,'q':9 , 'k':0,'P':-1 ,'N':-3, 'B':-3 , 'R':-5 ,'Q':-9 ,'K':0 };
	let totalScore = 0;

	board.forEach( row => {
		row.forEach( piece =>{
						if(piece!=null){
							if(piece.color=='w')
								totalScore += pieceScore[piece.type.toUpperCase()];
							else
								totalScore += pieceScore[piece.type];
						}
					})
				})
	return totalScore;
}

const alphabeta =(chess , depth ,alpha ,beta)  =>{
	if( chess.inCheckmate() && chess.turn()=='w')
		return 100;
	if( chess.inCheckmate() && chess.turn()=='b' )
		return -100;
	if( depth>1 )
		return score(chess.board());

	let allPossibleMoves = chess.moves();
	if(chess.turn()=='b'){	
		let maxScore = -Infinity;
		for(let move of allPossibleMoves){
			let chessCopy = new Chess(chess.fen());
			chessCopy.move(move);
			let currentScore = alphabeta(chessCopy , depth+1 , alpha , beta);
			maxScore = Math.max(maxScore , currentScore);
			alpha = Math.max(maxScore , alpha);
			if(alpha >= beta)
				break;
		}
		return maxScore;
	}else{
		let minScore = Infinity;
		for(let move of allPossibleMoves){
			let chessCopy = new Chess(chess.fen());
			chessCopy.move(move);
			let currentScore = alphabeta(chessCopy , depth+1 , alpha , beta);
			minScore = Math.min(minScore , currentScore);
			beta = Math.min(minScore , beta);
			if(alpha >= beta)
				break;
		}
		return minScore;
	}
}

const minmax =(chess , depth) => {    // computer plays black algorithm minmax
	if( chess.inCheckmate() && chess.turn()=='w' )
		return 100;
	if( chess.inCheckmate() && chess.turn()=='b' )
		return -100;
	if( depth>1 )
		return score(chess.board());

	let allPossibleMoves = chess.moves();
	let allPossibleScores = [];

	allPossibleMoves.forEach( move => {
		let chessCopy = new Chess(chess.fen());
		chessCopy.move(move);
		allPossibleScores.push(minmax(chessCopy , depth+1));
	});
	
	if( chess.turn() == 'b' ){	  	
		return Math.max(...allPossibleScores);
	}else{
		return Math.min(...allPossibleScores);
	}
}

const findBestMoveAlphaBeta =(chess) => {   // computer plays black
	let maxScore = -Infinity;
	let maxScoreMove = null;
	let currentScore = null;
	for( let move of chess.moves() ){
		let chessCopy = new Chess(chess.fen());
		chessCopy.move(move);
		currentScore = alphabeta(chessCopy , 0 , -Infinity , Infinity );
		if( currentScore>maxScore ){
			maxScore = currentScore;
			maxScoreMove = move;
		}
	}
	return maxScoreMove;
}

const findBestMove =(chess) => {

	let allPossibleMoves = chess.moves();
	let allPossibleMovesScore = [];
	let maxScore = null;
	let currentScore = null;

	allPossibleMoves.forEach( move => {
		let chessCopy = new Chess(chess.fen());
		chessCopy.move(move);

		currentScore =  minmax(chessCopy, 0);
		allPossibleMovesScore.push(currentScore);

		if( maxScore==null || currentScore>maxScore){
			maxScore = currentScore;
		}		
	} )
	let maxScoreMoves = allPossibleMoves.filter( (m,i)=> allPossibleMovesScore[i] == maxScore);
	if (maxScoreMoves.length == 1) 
		return maxScoreMoves[0];
	else
		return maxScoreMoves[ Math.floor( Math.random()*maxScoreMoves.length ) ];
}