#include "MessageQueue.hh"
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

MessageQueue::MessageQueue() {}

MessageQueue::~MessageQueue() {}

void MessageQueue::Push(const std::string &message)
{
  std::lock_guard<std::mutex> lock(mutex_);
  queue_.push(message);
  condition_.notify_one();
}

std::string MessageQueue::Pop()
{
  std::unique_lock<std::mutex> lock(mutex_);
  while (queue_.empty())
  {
    condition_.wait(lock);
  }
  std::string message = queue_.front();
  queue_.pop();
  return message;
}

std::vector<std::string> MessageQueue::Dump()
{
  auto length = static_cast<int>(queue_.size());
  std::vector<std::string> messages(length);
  std::lock_guard<std::mutex>
      lock(mutex_);
  for (int i = 0; i < length; i++)
  {
    messages[i] = queue_.front();
    queue_.pop();
  }
#ifdef __EMSCRIPTEN__
  std::vector<const char *> cstrings;
  for (const auto &message : messages)
  {
    cstrings.push_back(message.c_str());
  }
  EM_ASM(
      {
        let cstrings = $0;
        let length = $1;
        // console.log("cstrings: " + cstrings + " length: " + length);
        let messages = [];
        for (let i = 0; i < length; i++)
        {
          let strPtr = getValue(cstrings + i * 4, 'i32');
          let message = UTF8ToString(strPtr);
          messages.push(message);
        }
        let vertices = [];
        // console.log("messages: " + messages);
        for (let i = 0; i < messages.length; i++)
        {
          let data = messages[i].split(",");
          let position = data[3].split(" : ");
          vertices.push({
            event : Number.parseInt(data[0]),
            track : Number.parseInt(data[2]),
            x : Number.parseFloat(position[0]) / 200,
            y : Number.parseFloat(position[1]) / 200,
            z : Number.parseFloat(position[2]) / 200,
            particle : data[1]
          });
        }
        postMessage({type : "render", data : vertices});
      },
      cstrings.data(), cstrings.size());
#endif
  return messages;
}