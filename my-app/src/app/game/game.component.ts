import { Component, OnInit } from '@angular/core';

import { Board } from '../shared/model/board.model';
import { Coordinate } from '../shared/model/coordinate.model';
import { Piece } from '../shared/model/piece.model';

import { moveState } from '../shared/enums/state.enum';
import { colour } from '../shared/enums/colour.enum';
import { type } from '../shared/enums/type.enum';
import { UpdateBoardService } from '../shared/services/update-board.service';
import { HelperService } from '../shared/services/helper.service';
import { AvailableMovesService } from '../shared/services/available-moves.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalContentComponent } from './board/modal-content.component';
import { SoundService } from '../shared/services/sound.service';

interface SavedGameEntry {
  id: string;
  date: string;
  turn: string;
  moveNumber: number;
  state: any;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  bsModalRef?: BsModalRef;
  board: Board;
  turn: colour;
  state: moveState;
  blackKingPos: Coordinate;
  whiteKingPos: Coordinate;
  prevCoordinate: Coordinate;
  possibleMoves: Coordinate[];
  cantMoveCoordinate: Coordinate | null;
  selectedCoordinate: Coordinate | null;
  lastMoveFrom: Coordinate | null;
  lastMoveTo: Coordinate | null;
  capturedByWhite: Piece[] = [];
  capturedByBlack: Piece[] = [];
  moveNumber: number = 1;
  saveMessage: string = '';
  showSavedGames: boolean = false;
  savedGames: SavedGameEntry[] = [];

  boardFlipped: boolean = false;

  moveHistory: any[] = [];
  historyIndex: number = -1;

  private readonly SAVES_KEY = 'adachess-saves';
  private readonly MAX_SAVES = 20;

  constructor(
    public _availableMoves: AvailableMovesService,
    public _updateBoardService: UpdateBoardService,
    public _helperService: HelperService,
    private _modalService: BsModalService,
    private _sound: SoundService
  ) {}

  ngOnInit(): void {
    this._updateBoardService.gameMoveUpdate.subscribe(coordinate => {
      this.registerCoordinate(coordinate);
    });
    this.resetGame();
    this.loadSavedGamesList();
  }

  resetGame() {
    this.possibleMoves = [];
    this.cantMoveCoordinate = null;
    this.selectedCoordinate = null;
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
    this.board = new Board();
    this.blackKingPos = new Coordinate(0, 4);
    this.whiteKingPos = new Coordinate(7, 4);
    this.turn = colour.WHITE;
    this.state = moveState.AWAIT;
    this.capturedByWhite = [];
    this.capturedByBlack = [];
    this.moveNumber = 1;
    this.saveMessage = '';
    this.boardFlipped = false;
    this.moveHistory = [this.serializeState()];
    this.historyIndex = -1;
  }

  toggleFlip(): void {
    this.boardFlipped = !this.boardFlipped;
  }

  get isViewingHistory(): boolean {
    return this.historyIndex >= 0;
  }

  get currentMoveDisplay(): number {
    if (this.historyIndex >= 0) {
      return this.historyIndex;
    }
    return this.moveHistory.length - 1;
  }

  get totalMoves(): number {
    return this.moveHistory.length - 1;
  }

  goBack(): void {
    if (this.historyIndex < 0) {
      this.historyIndex = this.moveHistory.length - 2;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    } else {
      return;
    }
    this.restoreState(this.moveHistory[this.historyIndex]);
  }

  goForward(): void {
    if (this.historyIndex < 0) return;
    if (this.historyIndex < this.moveHistory.length - 1) {
      this.historyIndex++;
      if (this.historyIndex === this.moveHistory.length - 1) {
        this.historyIndex = -1;
      }
      const idx = this.historyIndex >= 0 ? this.historyIndex : this.moveHistory.length - 1;
      this.restoreState(this.moveHistory[idx]);
    }
  }

  get canGoBack(): boolean {
    if (this.historyIndex < 0) return this.moveHistory.length > 1;
    return this.historyIndex > 0;
  }

  get canGoForward(): boolean {
    return this.historyIndex >= 0;
  }

  selectPiece(piecePos: Coordinate): boolean {
    if (this.board.boxes[piecePos.x][piecePos.y].getPiece()?.colour == this.turn) {
      return true;
    }
    return false;
  }

  isValidMove(piecePos: Coordinate, move: Coordinate, availableMoves: Coordinate[], kingPos: Coordinate, board: Board): boolean {
    if (this._helperService.isInArray(availableMoves, move)) {
      let mockBoard = this._helperService.cloneBoard(board);
      if (board.boxes[piecePos.x][piecePos.y].getPiece()?.type == "king") {
        kingPos = move;
      }
      this._updateBoardService.movePiece(piecePos, move, mockBoard);
      if (this.kingInCheck(kingPos, mockBoard)) {
        return false;
      }
      return true;
    }
    return false;
  }

  kingInCheck(kingPos: Coordinate, board: Board): boolean {
    let kingColour = board.boxes[kingPos.x][kingPos.y].getPiece().colour;
    for (var i: number = 0; i < 8; i++) {
      for (var j: number = 0; j < 8; j++) {
        let currentPiece = board.boxes[i][j].getPiece();
        if (currentPiece?.colour == this._helperService.getOppositeColour(kingColour)) {
          if (this._helperService.isInArray(this._availableMoves.getMoves(board, board.boxes[i][j].coordinate, true), kingPos)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  pawnTransform(): void {
    for (let i = 0; i < 8; i++) {
      if (this.board.boxes[0][i].getPiece()?.colour == this.turn && this.board.boxes[0][i].getPiece()?.type == "pawn") {
        this.board.boxes[0][i].emptyBox();
        this.board.boxes[0][i].setPiece(new Piece(this.turn, type.queen));
      }
      if (this.board.boxes[7][i].getPiece()?.colour == this.turn && this.board.boxes[7][i].getPiece()?.type == "pawn") {
        this.board.boxes[7][i].emptyBox();
        this.board.boxes[7][i].setPiece(new Piece(this.turn, type.queen));
      }
    }
  }

  updateKings(newPos: Coordinate): void {
    switch (this.turn) {
      case "white":
        this.whiteKingPos = new Coordinate(newPos.x, newPos.y);
        break;
      case "black":
        this.blackKingPos = new Coordinate(newPos.x, newPos.y);
        break;
    }
  }

  checkGameOver(kingPos: Coordinate, board: Board): 'checkmate' | 'stalemate' | 'check' | 'normal' {
    let turnColour = board.boxes[kingPos.x][kingPos.y].getPiece().colour;
    let noMoves = this.isInStaleMate(kingPos, turnColour, board);
    let inCheck = this.kingInCheck(kingPos, board);

    if (noMoves && inCheck) {
      this.bsModalRef = this._modalService.show(ModalContentComponent, Object.assign({}, { class: 'modal-sm left' }));
      this.bsModalRef.content.gameOverMessage = this._helperService.getOppositeColour(turnColour) + " has won by checkmate!";
      this._modalService.onHide.subscribe(x => {
        this.resetGame();
      });
      return 'checkmate';
    } else if (noMoves) {
      this.bsModalRef = this._modalService.show(ModalContentComponent, Object.assign({}, { class: 'modal-sm left' }));
      this.bsModalRef.content.gameOverMessage = "Stalemate detected! No player wins";
      this._modalService.onHide.subscribe(x => {
        this.resetGame();
      });
      return 'stalemate';
    } else if (inCheck) {
      return 'check';
    }
    return 'normal';
  }

  isInStaleMate(kingPos: Coordinate, turnColour: colour, board: Board): boolean {
    for (var i: number = 0; i < 8; i++) {
      for (var j: number = 0; j < 8; j++) {
        let currentBox = board.boxes[i][j];
        if (currentBox.getPiece()?.colour == turnColour) {
          let availableMoves = this._availableMoves.getMoves(board, currentBox.coordinate);
          for (let i in availableMoves) {
            if (this.isValidMove(currentBox.coordinate, availableMoves[i], availableMoves, kingPos, board)) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  registerCoordinate(coordinate: Coordinate): void {
    if (this.isViewingHistory) {
      this.moveHistory = this.moveHistory.slice(0, this.historyIndex + 1);
      this.restoreState(this.moveHistory[this.historyIndex]);
      this.historyIndex = -1;
    }

    if (this.state == moveState.ATTEMPTMOVE) {
      let currentTurnKingPos = this.turn == colour.WHITE ? this.whiteKingPos : this.blackKingPos;
      if (this.isValidMove(this.prevCoordinate, coordinate, this.possibleMoves, currentTurnKingPos, this.board)) {
        let movedPiece = this.board.boxes[this.prevCoordinate.x][this.prevCoordinate.y].getPiece();
        if (movedPiece?.type == "king") {
          this.updateKings(coordinate);
          let yDiff = coordinate.y - this.prevCoordinate.y;
          if (Math.abs(yDiff) == 2) {
            let row = this.prevCoordinate.x;
            if (yDiff > 0) {
              let rook = this.board.boxes[row][7].getPiece();
              this._updateBoardService.movePiece(new Coordinate(row, 7), new Coordinate(row, 5), this.board);
              rook.hasMoved = true;
            } else {
              let rook = this.board.boxes[row][0].getPiece();
              this._updateBoardService.movePiece(new Coordinate(row, 0), new Coordinate(row, 3), this.board);
              rook.hasMoved = true;
            }
          }
        }
        movedPiece.hasMoved = true;
        this.lastMoveFrom = this.prevCoordinate;
        this.lastMoveTo = coordinate;

        let capturedPiece = this.board.boxes[coordinate.x][coordinate.y].getPiece();
        if (capturedPiece) {
          if (this.turn === colour.WHITE) {
            this.capturedByWhite.push(capturedPiece);
          } else {
            this.capturedByBlack.push(capturedPiece);
          }
        }

        this._updateBoardService.movePiece(this.prevCoordinate, coordinate, this.board);
        this.pawnTransform();
        this.turn = this._helperService.getOppositeColour(this.turn);
        if (this.turn === colour.WHITE) {
          this.moveNumber++;
        }

        currentTurnKingPos = this.turn == colour.WHITE ? this.whiteKingPos : this.blackKingPos;
        let result = this.checkGameOver(currentTurnKingPos, this.board);

        switch (result) {
          case 'checkmate': this._sound.playCheckmate(); break;
          case 'check':     this._sound.playCheck(); break;
          default:
            capturedPiece ? this._sound.playCapture() : this._sound.playMove();
        }

        this.moveHistory.push(this.serializeState());
      }
      this.possibleMoves = [];
      this.selectedCoordinate = null;
      this.state = moveState.AWAIT;
    }

    if (this.state == moveState.AWAIT) {
      if (this.selectPiece(coordinate)) {
        let currentTurnKingPos = this.turn == colour.WHITE ? this.whiteKingPos : this.blackKingPos;
        let rawMoves = this._availableMoves.getMoves(this.board, coordinate);
        let validMoves = rawMoves.filter(move =>
          this.isValidMove(coordinate, move, rawMoves, currentTurnKingPos, this.board)
        );
        if (validMoves.length > 0) {
          this.state = moveState.ATTEMPTMOVE;
          this.prevCoordinate = coordinate;
          this.possibleMoves = validMoves;
          this.selectedCoordinate = coordinate;
        } else {
          this.possibleMoves = [];
          this.cantMoveCoordinate = coordinate;
          this._sound.playError();
          setTimeout(() => this.cantMoveCoordinate = null, 600);
        }
      }
    }
  }

  // --- Piece display ---

  getPieceSymbol(piece: Piece): string {
    const symbols: Record<string, Record<string, string>> = {
      white: { king: '\u2654', queen: '\u2655', rook: '\u2656', bishop: '\u2657', knight: '\u2658', pawn: '\u2659' },
      black: { king: '\u265A', queen: '\u265B', rook: '\u265C', bishop: '\u265D', knight: '\u265E', pawn: '\u265F' }
    };
    return symbols[piece.colour]?.[piece.type] ?? '';
  }

  // --- Save / Load multiple games ---

  private serializeState(): any {
    return {
      turn: this.turn,
      moveNumber: this.moveNumber,
      whiteKingPos: { x: this.whiteKingPos.x, y: this.whiteKingPos.y },
      blackKingPos: { x: this.blackKingPos.x, y: this.blackKingPos.y },
      capturedByWhite: this.capturedByWhite.map(p => ({ colour: p.colour, type: p.type })),
      capturedByBlack: this.capturedByBlack.map(p => ({ colour: p.colour, type: p.type })),
      lastMoveFrom: this.lastMoveFrom ? { x: this.lastMoveFrom.x, y: this.lastMoveFrom.y } : null,
      lastMoveTo: this.lastMoveTo ? { x: this.lastMoveTo.x, y: this.lastMoveTo.y } : null,
      board: this.board.boxes.map(row =>
        row.map(box => {
          const piece = box.getPiece();
          return piece ? { colour: piece.colour, type: piece.type, hasMoved: piece.hasMoved } : null;
        })
      )
    };
  }

  private restoreState(state: any): void {
    this.board = new Board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (!this.board.boxes[i][j].isEmpty()) {
          this.board.boxes[i][j].emptyBox();
        }
      }
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const pieceData = state.board[i][j];
        if (pieceData) {
          const piece = new Piece(pieceData.colour, pieceData.type);
          piece.hasMoved = pieceData.hasMoved;
          this.board.boxes[i][j].setPiece(piece);
        }
      }
    }

    this.turn = state.turn;
    this.moveNumber = state.moveNumber || 1;
    this.whiteKingPos = new Coordinate(state.whiteKingPos.x, state.whiteKingPos.y);
    this.blackKingPos = new Coordinate(state.blackKingPos.x, state.blackKingPos.y);
    this.capturedByWhite = state.capturedByWhite.map((p: any) => new Piece(p.colour, p.type));
    this.capturedByBlack = state.capturedByBlack.map((p: any) => new Piece(p.colour, p.type));
    this.lastMoveFrom = state.lastMoveFrom ? new Coordinate(state.lastMoveFrom.x, state.lastMoveFrom.y) : null;
    this.lastMoveTo = state.lastMoveTo ? new Coordinate(state.lastMoveTo.x, state.lastMoveTo.y) : null;
    this.possibleMoves = [];
    this.selectedCoordinate = null;
    this.cantMoveCoordinate = null;
    this.state = moveState.AWAIT;
  }

  loadSavedGamesList(): void {
    const raw = localStorage.getItem(this.SAVES_KEY);
    this.savedGames = raw ? JSON.parse(raw) : [];
  }

  toggleSavedGames(): void {
    this.showSavedGames = !this.showSavedGames;
    if (this.showSavedGames) {
      this.loadSavedGamesList();
    }
  }

  saveGame(): void {
    this.loadSavedGamesList();
    const entry: SavedGameEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      turn: this.turn,
      moveNumber: this.moveNumber,
      state: this.serializeState()
    };
    this.savedGames.unshift(entry);
    if (this.savedGames.length > this.MAX_SAVES) {
      this.savedGames = this.savedGames.slice(0, this.MAX_SAVES);
    }
    localStorage.setItem(this.SAVES_KEY, JSON.stringify(this.savedGames));
    this.showMessage('Game saved!');
  }

  loadGameById(id: string): void {
    const save = this.savedGames.find(s => s.id === id);
    if (!save) return;
    try {
      this.restoreState(save.state);
      this.showSavedGames = false;
      this.showMessage('Game loaded!');
    } catch (e) {
      this.showMessage('Failed to load save');
    }
  }

  deleteSave(id: string, event: Event): void {
    event.stopPropagation();
    this.savedGames = this.savedGames.filter(s => s.id !== id);
    localStorage.setItem(this.SAVES_KEY, JSON.stringify(this.savedGames));
  }

  private showMessage(msg: string): void {
    this.saveMessage = msg;
    setTimeout(() => this.saveMessage = '', 2000);
  }
}
