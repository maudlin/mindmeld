# MindMeld

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. It is inspired by Scapple and designed for writers, researchers, and anyone who needs to organize their thoughts visually.

## Features

- **Freeform Canvas**: Place and move notes freely on a canvas.
- **Editable Notes**: Create, edit, and delete text notes.
- **Connections**: Draw lines between notes to indicate relationships.
- **Saving and Loading**: Save your mind maps to the server and load them later.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **DevContainer**: Docker, VSCode

## Getting Started

### Prerequisites

- Docker
- VSCode with Remote - Containers extension
- Node.js

### Installation

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/mindmeld.git
    cd mindmeld
    ```

1. **Open in DevContainer**:
    - Open VSCode.
    - Open the command palette (Ctrl + Shift + P).
    - Select "Remote-Containers: Open Folder in Container..." and choose the `mindmeld` folder.

### Running the Application

1. **Start the Backend**:
    Inside the devcontainer terminal, navigate to the `backend` directory and start the server:
    ```bash
    cd backend
    npm start
    ```

1. **Open the Frontend**:
    Open `frontend/index.html` in your browser to start using MindMeld.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
