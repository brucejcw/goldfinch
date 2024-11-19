const socket = io();
let autoScroll = true

function uuidV4() {
    const uuid = new Array(36);
    for (let i = 0; i < 36; i++) {
        uuid[i] = Math.floor(Math.random() * 16);
    }
    uuid[14] = 4; // set bits 12-15 of time-high-and-version to 0100
    uuid[19] = uuid[19] &= ~(1 << 2); // set bit 6 of clock-seq-and-reserved to zero
    uuid[19] = uuid[19] |= (1 << 3); // set bit 7 of clock-seq-and-reserved to one
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.map((x) => x.toString(16)).join('');
}



function copyToClipboard(text, callback) {
    navigator.clipboard.writeText(text)
        .then(() => {
            callback && callback()
        })
        .catch(err => {
            console.error('Failed to copy text:', err);
        });
}

function getMsgNode (msg) {
    let messageNode = $('<li>').text(msg)
    const $copy = $('<div>').addClass('copy')

    if (msg.includes('🎉文件上传成功')) {
        messageNode = $('<li>').html(msg)
    } else {
        $copy.on('click', function(){
            copyToClipboard(msg, function(){
                $copy.text('Copied!')
                setTimeout(function() {
                    $copy.text('Copy')
                }, 2000)
            })
        })
    }

    messageNode.prepend($copy.text('Copy'))
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

socket.on('chat history', function (chatHistory) {
    const messagesDiv = $('#messages');
    messagesDiv.empty()
    chatHistory.forEach((msg) => {
        messagesDiv.append(getMsgNode(msg));
    })
});

$('input[type="file"]').click(function () {
    $('#upload-percent').text('');
})

// 上传文件
const fileForm = $('#file-form');

function upload (formData) {
    $.ajax({
        url: '/upload',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhr: function () {
            var xhr = $.ajaxSettings.xhr()
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    var percent = Math.round((e.loaded / e.total) * 100)
                    $('#upload-percent').text(percent + '%')
                }
            }
            return xhr
        },
        success: function (data) {
            let message = `🎉文件上传成功: <a href="/upload/${data.fileName}" download>${data.fileName}</a>`
            if (/\.(png|jpg|jpeg|gif)/i.test(data.fileName)) {
                message += `<div><img src="/upload/${data.fileName}" /></div>`
            }
            socket.emit('chat message', message)
        },
        error: function (xhr, status, error) {
            alert('文件上传失败：' + error)
        }
    })
}

fileForm.submit(function (e) {
    e.preventDefault();
    const fileInput = fileForm.find('input[type=file]')[0];
    const file = fileInput.files[0];
    const fileName = encodeURIComponent(file.name); // 对文件名进行编码
    const formData = new FormData();
    formData.append('file', file, fileName);
    upload(formData)
});

$('#send').on('click', function() {
    event.preventDefault();
    const messageInput = $('#myTextarea');
    const message = messageInput.val();
    socket.emit('chat message', message);
    messageInput.val('');
})

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
}).on('paste', function(event) {
    // 取得剪贴板数据
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    // 遍历剪贴板中的所有数据项
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 如果是图像数据
        if (item.type.indexOf("image") !== -1) {
            // 从数据项中获取图像文件
            const blob = item.getAsFile();

            // 创建一个 URL 对象
            const url = URL.createObjectURL(blob);

            // 创建一个图像元素
            const img = document.createElement('img');

            // 设置图像的 src 属性
            img.src = url;

            // 将图像添加到表单中
            const formData = new FormData();
            formData.append('file', blob, `image-${uuidV4()}.png`);
            upload(formData)

            $('#myTextarea').val('');
        }
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
