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
    // await client.connect();

    const petsCategoryCollection = client.db("petConnectDb").collection("petsCategory");
    const usersCollection = client.db("petConnectDb").collection("users");
    const petsCollection = client.db("petConnectDb").collection("pets");
    const donationCampaignsCollections = client.db("petConnectDb").collection("donationCampaigns");
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
    // verify admin

    const verifyAdmin =async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
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
    app.get('/users',verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message:'forbidden access'})

      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin })
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
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    } )



    //pet related api
    app.get('/pets',  async (req, res) => {
      let query = {};
      
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await petsCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/pets',verifyToken, async (req, res) => {
      const petInfo = req.body;
      const result = await petsCollection.insertOne(petInfo)
      res.send(result)
    })
    app.get('/pets/:id',  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petsCollection.findOne(query)
      res.send(result)
    })
    app.put('/pets/:id',verifyToken, async (req, res) => {
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
    app.delete('/pets/:id', verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await petsCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/pets/:id', verifyToken, async(req,res)=>{
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
    app.get('/adoptionRequest', async(req,res)=>{
      const result = await adoptionRequestCollections.find().toArray()
      res.send(result)
    })
    
    app.post('/adoptionRequest', verifyToken, async (req, res) => {
      const adoptionInfo = req.body;
      const query = {petId: adoptionInfo.petId, email: adoptionInfo.email}
      console.log(query)
    existingRequest = await adoptionRequestCollections.findOne(query)
      if(existingRequest){
        return res.send({ message: 'This pet adopted request is already send', insertedId: null})
      }
      const result = await adoptionRequestCollections.insertOne(adoptionInfo)
      res.send(result)
    })
    app.patch('/adoptionRequest/:id', verifyToken, async(req,res)=>{
      const requestInfo= req.body;
      console.log(requestInfo)
    
      const id = req.params.id;
      const filter = {_id: new ObjectId (id)}
      const updatedDoc ={
        $set:{
          status: requestInfo.status
        }
      }
      console.log(requestInfo)
      const result = await adoptionRequestCollections.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //donation Campaign related api
    app.post('/donationCampaigns',verifyToken, async (req, res) => {
      const petInfo = req.body;
      const result = await donationCampaignsCollections.insertOne(petInfo)
      res.send(result)
    })
    app.get('/donationCampaigns', async (req, res) => {
      let query = {};
      console.log(req.query.email)
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await donationCampaignsCollections.find(query).toArray()
      res.send(result)
    })
    app.get('/donationCampaigns/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationCampaignsCollections.findOne(query)
      res.send(result)
    })

    app.put('/donationCampaigns/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedDonationCampaigns = req.body;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          petName: updatedDonationCampaigns.petName,
          petImage: updatedDonationCampaigns.petImage, 
          maxDonation: updatedDonationCampaigns.maxDonation,
          lastDate: updatedDonationCampaigns.lastDate,
          short_description: updatedDonationCampaigns.short_description,
          long_description: updatedDonationCampaigns.long_description,
          
        }
      }
      const result = await donationCampaignsCollections.updateOne(filter, updatedDoc, options)
      res.send(result)
    })
    app.delete('/donationCampaigns/:id',verifyToken, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await donationCampaignsCollections.deleteOne(query);
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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