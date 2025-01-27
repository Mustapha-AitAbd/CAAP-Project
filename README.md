# CAAP-Project

This project implements the Consensus-Based Adaptive Authentication Protocol (CAAP), an innovative authentication method based on blockchain technology. Using dynamic consensus between multiple nodes, CAAP validates each authentication attempt in a distributed manner, ensuring enhanced security against attacks.

---

## Prerequisites

Before running the application, ensure you have the following installed on your local machine:

1. **Node.js** (for running the application server)
2. **Ganache CLI** (for simulating the blockchain system)
3. **Redis** (for in-memory data storage)

---

## Setup Instructions

Follow these steps to test the application locally:

### 1. Clone the Repository

Clone this repository to your local machine using:

```bash
git clone https://github.com/Mustapha-AitAbd/CAAP-Project.git
```

### 2. Navigate to the Project Directory

Navigate to the project directory:

```bash
cd CAAP-Project
```

### 3. Install Dependencies

Run the following command to install the required Node.js packages:

```bash
npm install
```

---

## Running the Application

Follow these steps to start all the required services and the application:

### 1. Start the Application Server

Start the server using Node.js:

```bash
node app.js
```

### 2. Start Ganache CLI

Run Ganache CLI to simulate the blockchain system. Use the following command with the port `7545`:

```bash
ganache-cli -p 7545
```

### 3. Start Redis Server

Start the Redis server using the command:

```bash
redis-server
```

---

## Accessing the Application

Once all the services are running, you can access the application at the designated endpoint (e.g., `http://localhost:3000`).

---

## Contributing

If you'd like to contribute to this project, feel free to fork the repository, make changes, and open a pull request. Suggestions and improvements are welcome!

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---
