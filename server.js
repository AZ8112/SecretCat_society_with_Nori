const express = require("express");
const mysql = require("mysql2");
 const cors = require('cors');

 const app = express();
const port = 3000;

// const corsOptions = {
//     origin: "*",
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     optionsSuccessStatus: 204
//   };

app.use(express.json({limit: "10mb"})); 

app.use(cors());
app.options('*', cors());

// app.all('/*', function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "X-Requested-With");
//     next();
//   });

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
       res.sendStatus(200);
     }
     else {
       next();
     }});

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    port: 3306,
    password: "KBEK15162118root",
    database: "profiles"
  },
);

  db.connect((err) => {
    if (err) {
        console.error("Database connection failed: ", err);
        return;
    }
    console.log("Connected to MySQL database.");
});

// Create table if it does not exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS character_profile (
    character_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(80),
    age varchar(50),
    gender_pronouns varchar(60),
    character_description LONGTEXT,
    image MEDIUMBLOB
)`;

db.query(createTableQuery, (err) => {
    if (err) console.error("Table creation failed:", err);
});


// API to insert data into MySQL
app.post("/add-profile", async (req, res) => {
    const { first_name, middle_name, last_name, age, gender_pronouns, character_description, image } = req.body;

    if (!first_name) {
        return res.status(400).json({ error: "First name is required." });
    }

    try {
        const sql = "INSERT INTO character_profile (first_name, middle_name, last_name, age, gender_pronouns, character_description, image) VALUES (?, ?, ?, ?, ?, ?, ?)";

        let imageBuffer = null;
        if (image && image.startsWith("data:image")) {
            imageBuffer = Buffer.from(image.split(",")[1], "base64"); // Convert Base64 to Binary
        }

        const [result] = await db.promise().query(sql, [
            first_name, middle_name || null, last_name || null,
            age || null, gender_pronouns || null, character_description || null, imageBuffer  // Store image as BLOB
        ]);

        res.status(200).json({ message: "Profile added successfully", character_id: result.insertId });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Error inserting data" });
    }
});

// API to Get All Profiles
app.get("/get-profiles", async (req, res) => {
    try {
        const sql = "SELECT * FROM character_profile";
        const [results] = await db.promise().query(sql);

        if (results.length === 0) {
            return res.status(404).json({ message: "No profiles found" });
        }

        //  Properly handle image conversion
        const profilesWithImages = results.map(profile => ({
            character_id: profile.character_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            age: profile.age,
            gender_pronouns: profile.gender_pronouns,
            character_description: profile.character_description,
            image: profile.image 
                ? `data:image/png;base64,${Buffer.from(profile.image).toString("base64")}` //  Convert image to Base64 properly
                : null //  If there's no image, return null
        }));

        res.status(200).json(profilesWithImages);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Error retrieving profiles" });
    }
});



// API to Delete a Profile
app.delete('/delete-profile/:character_id', (req, res) => {
    const character_id = req.params.character_id;

    if (!character_id || isNaN(character_id)) {
        console.error("Invalid character_id:", character_id);
        return res.status(400).json({ success: false, message: 'Invalid character ID' });
    }

    db.query('DELETE FROM character_profile WHERE character_id = ?', [character_id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }

        if (result.affectedRows === 0) {
            console.warn(`Profile with character_id ${character_id} not found.`);
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        console.log(`Profile with character_id ${character_id} deleted successfully.`);
        res.json({ success: true, message: 'Profile deleted successfully' });
    });
});




app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(r.route.path, Object.keys(r.route.methods));
    }
});

console.log("GET /get-profiles called");
console.log("POST /add-profile called");


// API to Update a Profile
app.put("/update-profile/:character_id", async (req, res) => {
    const { character_id } = req.params;
    const { first_name, middle_name, last_name, age, gender_pronouns, character_description, image } = req.body;

    if (!character_id || isNaN(character_id)) {
        return res.status(400).json({ error: "Invalid character ID" });
    }

    try {
        let sql = `UPDATE character_profile 
                   SET first_name = ?, middle_name = ?, last_name = ?, age = ?, gender_pronouns = ?, character_description = ?, image = ? 
                   WHERE character_id = ?`;

        let imageBuffer = null;
        if (image && image.startsWith("data:image")) {
            imageBuffer = Buffer.from(image.split(",")[1], "base64"); // Convert Base64 to Binary
        }

        const [result] = await db.promise().query(sql, [
            first_name, middle_name || null, last_name || null,
            age || null, gender_pronouns || null, character_description || null, imageBuffer || null, character_id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Error updating profile" });
    }
});


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 