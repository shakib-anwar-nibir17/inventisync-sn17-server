const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ctziwlh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const userCollection = client.db("inventoryDB").collection("users");
const shopCollection = client.db("inventoryDB").collection("shops");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// user related apis ------------------------------------------

// get users
app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// get a specific user
app.get("/users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await userCollection.find(query).toArray();
  console.log(result);
  res.send(result);
});

// update user info
app.put("/users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const updatedUserInfo = req.body;
  const options = { upsert: true };
  const UpdatedDoc = {
    $set: {
      role: "manager",
      shop_id: updatedUserInfo.shop_id,
      shop_name: updatedUserInfo.shop_name,
      shop_logo: updatedUserInfo.shop_logo,
    },
  };
  const result = await userCollection.updateOne(query, UpdatedDoc, options);
  res.send(result);
});

// shop related api

app.post("/shops", async (req, res) => {
  const shopInfo = req.body;
  const result = await shopCollection.insertOne(shopInfo);
  res.send(result);
});

// post a new user
app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "User already exist", insertedId: null });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

// delete a user
app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});

// home ------------------------------------------------

app.get("/", (req, res) => {
  res.send("Inventory Management Server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
