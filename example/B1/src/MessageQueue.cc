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
  EM_ASM({
    let messages = arguments[0];
    let vertices = []
    for (let i = 0; i < messages.size(); i++) {
        const message = messages.get(i);
        let data = message.split(",");`
        let position = data[3].split(" : ");
        vertices.push({
            event: Number.parseInt(data[0]),
            track: Number.parseInt(data[2]),
            x: Number.parseFloat(position[0]) / 200,
            y: Number.parseFloat(position[1]) / 200,
            z: Number.parseFloat(position[2]) / 200,
        });
    }
    postMessage({ type: "render", data: vertices }); }, messages);
#endif
  return messages;
}