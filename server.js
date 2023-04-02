const express = require('express');
const http = require('http');
const fs = require('fs');
const async = require('async');
const path = require('path');
const socketio = require('socket.io');

const multer = require('multer');
const app = express();
const upload = multer({ dest: 'public/upload/' }); // 设置文件上传目录
const server = http.createServer(app);
const io = socketio(server);

const CHAT_CONTENT_PATH = path.join(__dirname, 'chat-content.txt')

if (!fs.existsSync(CHAT_CONTENT_PATH)) {
  fs.writeFileSync(CHAT_CONTENT_PATH, '', 'utf-8')
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const WRITE_SEPARATOR = '\n------WRITE_SEPARATOR-----\n'
let chatHistory = fs.readFileSync(CHAT_CONTENT_PATH, 'utf-8').split(WRITE_SEPARATOR) // 用于存储历史聊天记录的数组

// 定义写入文件的队列
const writeQueue = async.queue((task, callback) => {
  // 写入文件
  fs.appendFile(task.filePath, task.fileData + WRITE_SEPARATOR, (err) => {
    if (err) {
      console.error(`Error writing file ${task.filePath}: ${err}`);
    } else {
      console.log(`File saved: ${task.filePath}`);
    }
    // 执行回调函数
    callback();
  });
}, 1); // 同时只能有一个任务在执行

// 写入文件的函数
function appendFile(msg) {
  chatHistory.push(msg); // 将新消息添加到历史记录中
  // 将任务加入队列
  writeQueue.push({ filePath: CHAT_CONTENT_PATH, fileData: msg });
}

function writeFile() {
  fs.writeFileSync(CHAT_CONTENT_PATH, '', 'utf-8')
}

// 处理文件上传请求
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    const fileName = decodeURIComponent(req.file.originalname);
    const oldPath = req.file.path;
    const newPath = path.join(__dirname, 'public/upload', fileName);
    fs.rename(oldPath, newPath, err => {
      if (err) {
        console.error('文件保存失败：', err);
        res.send({ success: false, message: '文件保存失败' });
      } else {
        console.log('文件上传成功：', fileName);
        res.send({ success: true, message: '文件上传成功', fileName: fileName });
      }
    });
  } else {
    console.log('文件上传失败');
    res.send({ success: false, message: '文件上传失败' });
  }
});

/**
 * 删除文件夹下所有问价及将文件夹下所有文件清空
 * @param {*} path
 */
function emptyDir(path) {
  const files = fs.readdirSync(path);
  files.forEach(file => {
    const filePath = `${path}/${file}`;
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      emptyDir(filePath);
    } else {
      fs.unlinkSync(filePath);
      console.log(`删除${file}文件成功`);
    }
  });
}

io.on('connection', (socket) => {
  console.log('a user connected');

  // 发送历史聊天记录给新加入的用户
  socket.emit('chat history', chatHistory);

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', (msg) => {
    console.log(`message: ${msg}`);
    appendFile(msg)
    io.emit('chat message', msg);
  });

  socket.on('clear', () => {
    writeFile('')
    chatHistory = []
    io.emit('chat history', chatHistory);
    emptyDir('public/upload')
  });
});

server.listen(9000, () => {
  console.log('Server started at http://localhost:9000');
});
