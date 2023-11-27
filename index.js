const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json())

//mongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dezesb0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const petsCategoryCollection = client.db("petConnectDb").collection("petsCategory");
    const usersCollection = client.db("petConnectDb").collection("users");
    const petsCollection = client.db("petConnectDb").collection("pets");
    const donationsCollections = client.db("petConnectDb").collection("donations");
    const adoptionRequestCollections = client.db("petConnectDb").collection("adoptionRequest");

    //middle wares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })

        }
        req.decoded = decoded;
        next();
      })

    }



    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })

    //category related api
    app.get('/petsCategory', async (req, res) => {
      const result = await petsCategoryCollection.find().toArray()
      res.send(result)
    })


    // users related api
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      //  insert email if user doesn't exists:
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })



    //pet related api
    app.get('/pets', async (req, res) => {
      let query = {};
      
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await petsCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/pets', async (req, res) => {
      const petInfo = req.body;
      const result = await petsCollection.insertOne(petInfo)
      res.send(result)
    })
    app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petsCollection.findOne(query)
      res.send(result)
    })
    app.put('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const updatedPets = req.body;

      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {

          petImage: updatedPets.petImage,
          petName: updatedPets.petName,
          petAge: updatedPets.petAge,
          category: updatedPets.category,
          location: updatedPets.location,
          short_description: updatedPets.short_description,
          long_description: updatedPets.long_description,
          // addedDate: updatedPets.addedDate,
          // adopted: updatedPets.adopted,
          // email: updatedPets.email
        }
      }
      const result = await petsCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })
    app.delete('/pets/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await petsCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/pets/:id', async(req,res)=>{
      const item= req.body;
      console.log(item)
      const id = req.params.id;
      const filter = {_id: new ObjectId (id)}
      const updatedDoc ={
        $set:{
          adopted: item.adopted
          
        }
      }
      console.log(item)
      const result = await petsCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //adoption request related api
    app.post('/adoptionRequest', async (req, res) => {
      const adoptionInfo = req.body;
      const query = {petId: adoptionInfo.petId}
      console.log(query)
    existingRequest = await adoptionRequestCollections.findOne(query)
      if(existingRequest){
        return res.send({ message: 'This pet adopted request is already send', insertedId: null})
      }
      const result = await adoptionRequestCollections.insertOne(adoptionInfo)
      res.send(result)
    })


    //donation Campaign related api
    app.post('/donations', async (req, res) => {
      const petInfo = req.body;
      const result = await donationsCollections.insertOne(petInfo)
      res.send(result)
    })
    app.get('/donations', async (req, res) => {
      let query = {};
      console.log(req.query.email)
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await donationsCollections.find(query).toArray()
      res.send(result)
    })
    app.get('/donations/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationsCollections.findOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Server is ok')
})
app.listen(port, () => {
  console.log(`Pet Connect Server is running on port:${port}`)
})