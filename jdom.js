const axios = require("axios");
const { JSDOM } = require("jsdom");
const express = require("express");
const path = require("path");
const socketIo=require("socket.io")

const app = express();
const server = require("http").createServer(app);
const cors=require("cors")
app.use(cors())
const io = socketIo(server);
let scrapping = { status: false, stop: function(){this.status = true;}, start: function(){this.status = false;} };

// Socket.IO event handlers
io.on('connection', socket => {
    console.log('A client connected');
});

io.on('disconnect', (socket) => {
    console.log("ok")
});

async function getData(url) {
    try{
        const htmlRequest = await axios.get(
            url,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                // Add any other headers you need here
              },
            }
          );
          const htmlContent = htmlRequest.data;
          return htmlContent;
    }catch(err){
        console.log("get data function error")
    }
}

async function getNextPageLink(htmlContent) {
  try {
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        const nextPageLink =  document.querySelector('div.pagination-wrapper.nocontent a[title="Next"]') ? document.querySelectorAll('div.pagination-wrapper.nocontent a[title="Next"]') : null;
        return nextPageLink[0].href;
  } catch (err) {
    console.log("next page link function error");
  }
}

async function getEmail(jobUrl, res) {
  try{
    console.log(scrapping);
      const htmlRequest = await axios.get(
        jobUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            // Add any other headers you need here
          },
        }
      );
        const htmlContent = htmlRequest.data;
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        const email =  document.querySelectorAll('.content .information .contact .links a')[0].href.replace("mailto:","")
        io.emit("getEmail",email)
        return email;
    
      
  }catch(err){
      console.log(err)
  }
}

async function scrape(url, res) {
  try {
    while (url) {
      const htmlContent = await getData("https://www.travelweekly.com/"+url);
      const nextPageLink = await getNextPageLink(htmlContent);
      const dom=new JSDOM(htmlContent)
      const document=dom.window.document;

      const jobLinks=document.querySelectorAll(".col-sm-6.col-md-8.col-lg-6 .title")
      const links=Array.from(jobLinks).map(j=>{
            const fullLink="https://www.travelweekly.com/" + j.href
            return fullLink
      })
      if(scrapping.status === true){
        return res.json({status:"ended"})
      }
      for (const jobUrl of links) {
        await getEmail(jobUrl,res);
      }
      url = nextPageLink;
    }
    res.json({status:"finish"})
  } catch (err) {
    console.log(err);
  }
}

app.use(express.static(path.join(__dirname,"public")))

app.post("/email/:city",(req, res, next)=>{
  scrapping.start();
  const startUrl = "Hotels/"+req.params.city+"?pg=1";
  scrape(startUrl,res);
})

app.post("/stop",(req, res, next)=>{
  stopScrapping()
  res.json({status:scrapping.status})
})

const PORT=process.env.PORT||5000
server.listen(PORT, (_) => {
  console.log("server is listen on port 5000");
});

async function stopScrapping(){
  scrapping.stop();
}