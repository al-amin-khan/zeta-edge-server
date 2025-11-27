const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    "http://localhost:3000",
    "https://zeta-edge-server.vercel.app",
];
const corsOptions = {
    origin: allowedOrigins,
};

app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.CLUSTER_NAME}.fouwysj.mongodb.net/?appName=${process.env.APP_NAME}`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        // await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );

        const db = client.db("ZE_DB");
        const productsCollection = db.collection("products");

        app.get("/api/products", async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 0;
                if (limit) {
                    const products = await productsCollection
                        .find()
                        .limit(limit)
                        .toArray();
                    return res.send(products);
                }
                const products = await productsCollection.find().toArray();
                res.send(products);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to fetch products" });
            }
        });
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Zeta Edge server is running");
});

// ------- HEALTH CHECK API WITH MONGODB CONNECTION STATUS -------
app.get("/health", async (req, res) => {
    const mem = process.memoryUsage();

    try {
        const start = Date.now();

        await client.db("admin").command({ ping: 1 });

        const latencyMs = Date.now() - start;

        return res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            mongodb: {
                ok: true,
                message: "MongoDB is reachable",
                latencyMs,
            },
            uptimeSeconds: Math.floor(process.uptime()),
            memory: {
                rss: mem.rss,
                heapTotal: mem.heapTotal,
                heapUsed: mem.heapUsed,
            },
        });
    } catch (err) {
        return res.status(503).json({
            status: "down",
            timestamp: new Date().toISOString(),
            mongodb: {
                ok: false,
                message: err.message || "MongoDB ping failed",
            },
        });
    }
});

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
