import asyncio
import websockets

async def connect_to_websocket():
    uri = "ws://ec2-18-223-237-44.us-east-2.compute.amazonaws.com:5001"  # WebSocket URL

    async with websockets.connect(uri) as websocket:
        # Send a message to the WebSocket server
        await websocket.send("Hello from Python client!")
        print("Message sent to server")

        # Receive message from server
        response = await websocket.recv()
        print(f"Received message from server: {response}")

# Run the event loop
asyncio.get_event_loop().run_until_complete(connect_to_websocket())
