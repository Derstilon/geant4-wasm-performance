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
			let messages = [];
			for (let i = 0; i < length; i++)
			{
				let strPtr = getValue(cstrings + i * 4, 'i32');
				let message = UTF8ToString(strPtr);
				messages.push(message);
			}
			postMessage({type : "render", data : messages, time : Date.now()});
		},
		cstrings.data(), cstrings.size());
#endif
	return messages;
}