const socket = io();
let autoScroll = true

function getMsgNode (msg) {
    let messageNode = $('<li>').text(msg)
    if (msg.includes('文件上传成功')) {
        messageNode = $('<li>').html(msg)
    }
    return messageNode
}

function scrollBottom () {
    const messagesDiv = $('#messages')
    const scrollHeight = messagesDiv.prop('scrollHeight')
    messagesDiv.scrollTop(scrollHeight - messagesDiv.height())
}

// 处理服务器发送过来的消息
socket.on('chat message', function (msg) {
    const messagesDiv = $('#messages');
    messagesDiv.append(getMsgNode(msg));
    autoScroll && scrollBottom()
});

// 处理服务器发送过来的文件上传消息
socket.on('file upload', function (fileName) {
    socket.emit('chat message', `文件上传成功: <a href="/upload/${fileName}" download>${fileName}</a>`)
    autoScroll && scrollBottom()
});

socket.on('chat history', function (chatHistory) {
    const messagesDiv = $('#messages');
    messagesDiv.empty()
    chatHistory.forEach((msg) => {
        messagesDiv.append(getMsgNode(msg));
    })
});

// 上传文件
const fileForm = $('#file-form');
fileForm.submit(function (e) {
    e.preventDefault();
    const fileInput = fileForm.find('input[type=file]')[0];
    const file = fileInput.files[0];
    const fileName = encodeURIComponent(file.name); // 对文件名进行编码
    const formData = new FormData();
    formData.append('file', file, fileName);
    $.ajax({
        url: '/upload',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
            socket.emit('chat message', `文件上传成功: <a href="/upload/${data.fileName}" download>${data.fileName}</a>`)
            scrollBottom()
        },
        error: function (xhr, status, error) {
            alert('文件上传失败：' + error);
        }
    });
});

$('#myTextarea').keydown(function(event) {
    // 检测是否按下Ctrl+V键
    if (event.shiftKey && event.keyCode === 13) {
        event.preventDefault(); // 阻止默认的Enter行为
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;
        this.value = value.substring(0, start) + '\n' + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    } else if (event.keyCode === 13) {
        event.preventDefault();
        const messageInput = $('#myTextarea');
        const message = messageInput.val();
        socket.emit('chat message', message);
        messageInput.val('');
    }
});

$('#clear').dblclick(function () {
    socket.emit('clear')
})

const progressBar = document.querySelector('.progress-bar');
const content = document.querySelector('#messages');

content.addEventListener('scroll', () => {
    const scrollTop = content.scrollTop;
    const scrollHeight = content.scrollHeight - content.clientHeight;
    const progressWidth = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = `${progressWidth}%`;
});

$("#chx").click(function () {
    autoScroll = $(this).prop('checked')
    if (autoScroll) {
        scrollBottom()
    }
})
