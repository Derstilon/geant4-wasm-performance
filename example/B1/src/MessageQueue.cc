#include "MessageQueue.hh"
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

MessageQueue::MessageQueue() {}

MessageQueue::~MessageQueue() {}

void MessageQueue::Push(const std::string& message) {
  std::lock_guard<std::mutex> lock(mutex_);
  queue_.push(message);
  condition_.notify_one();
}

std::string MessageQueue::Pop() {
  std::unique_lock<std::mutex> lock(mutex_);
  while (queue_.empty()) {
    condition_.wait(lock);
  }
  std::string message = queue_.front();
  queue_.pop();
  return message;
}

std::vector<std::string> MessageQueue::Dump() {
  std::vector<std::string> messages;
  std::lock_guard<std::mutex> lock(mutex_);
  while (!queue_.empty()) {
    messages.push_back(queue_.front());
    queue_.pop();
  }
  return messages;
}