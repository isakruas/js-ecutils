package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Message struct {
	Type string `json:"type"`
	Room string `json:"room"`
	Text string `json:"text"`
}

type RoomManager struct {
	rooms map[string]map[*websocket.Conn]bool
	mutex sync.RWMutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]map[*websocket.Conn]bool),
	}
}

func (rm *RoomManager) AddClientToRoom(room string, client *websocket.Conn) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if rm.rooms[room] == nil {
		rm.rooms[room] = make(map[*websocket.Conn]bool)
	}
	rm.rooms[room][client] = true
	log.Printf("[%s] client added to room %s\n", time.Now().UTC().Format(time.RFC3339), room)
}

func (rm *RoomManager) RemoveClientFromRoom(room string, client *websocket.Conn) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if rm.rooms[room] != nil {
		delete(rm.rooms[room], client)
		if len(rm.rooms[room]) == 0 {
			delete(rm.rooms, room)
			log.Printf("[%s] room %s is now empty and removed\n", time.Now().UTC().Format(time.RFC3339), room)
		}
	}
}

func (rm *RoomManager) BroadcastMessage(room string, message []byte, sender *websocket.Conn) {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	if rm.rooms[room] != nil {
		for client := range rm.rooms[room] {
			if client != sender {
				go func(c *websocket.Conn) {
					if err := c.WriteMessage(websocket.TextMessage, message); err != nil {
						log.Printf("[%s] error broadcasting message to client: %v\n", time.Now().UTC().Format(time.RFC3339), err)
						rm.RemoveClientFromRoom(room, c)
					}
				}(client)
			}
		}
		log.Printf("[%s] message broadcasted to room %s\n", time.Now().UTC().Format(time.RFC3339), room)
	}
}

func wsHandler(rm *RoomManager, w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// Allow all connections by default
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[%s] error upgrading to websocket: %v\n", time.Now().UTC().Format(time.RFC3339), err)
		return
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[%s] error reading message: %v\n", time.Now().UTC().Format(time.RFC3339), err)
			rm.RemoveClientFromRoom("", conn)
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[%s] error unmarshalling message: %v\n", time.Now().UTC().Format(time.RFC3339), err)
			continue
		}

		switch msg.Type {
		case "join":
			rm.AddClientToRoom(msg.Room, conn)
		case "text":
			go rm.BroadcastMessage(msg.Room, message, conn)
		case "audio":
			go rm.BroadcastMessage(msg.Room, message, conn)
		default:
			log.Printf("[%s] invalid message type: %s\n", time.Now().UTC().Format(time.RFC3339), msg.Type)
		}
	}
}

func main() {
	rm := NewRoomManager()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		wsHandler(rm, w, r)
	})
	log.SetFlags(0)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
