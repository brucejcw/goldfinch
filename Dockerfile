FROM node:18

# 设置工作目录为 /app
WORKDIR /app

COPY . /app
RUN npm install

# 暴露容器的 9000 端口
EXPOSE 9000

# 在容器中运行命令 npm start，启动应用
CMD ["npm", "start"]
