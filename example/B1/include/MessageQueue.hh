#ifndef MESSAGE_QUEUE_HH
#define MESSAGE_QUEUE_HH 1

#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

class MessageQueue {
public:
  MessageQueue();
  ~MessageQueue();

  void Push(const std::string& message);
  std::string Pop();
  std::vector<std::string> Dump();
private:
  std::mutex mutex_;
  std::condition_variable condition_;
  std::queue<std::string> queue_;
};

#endif