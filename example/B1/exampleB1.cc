#include "B1DetectorConstruction.hh"
#include "B1ActionInitialization.hh"

#include "G4RunManager.hh"
#include "B1RunAction.hh"
#include "G4ScoringManager.hh"

#include "G4UImanager.hh"
#include "QBBC.hh"

#include "G4VisExecutive.hh"
#include "G4UIExecutive.hh"

#include "Randomize.hh"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten.h>
#endif

#include <chrono>
#include <vector>
#include <string>

G4RunManager *runManager;
G4UImanager *UImanager;

void init()
{
#ifdef __EMSCRIPTEN__
  EM_ASM(

      // const out = console.log;
      // FS.trackingDelegate['onOpenFile'] = function(path, flags) {
      //   out('Opened "' + path + '" with flags ' + flags);
      //   self.dependecyArray.add(path);
      // };

      // FS.trackingDelegate['onCloseFile'] = function(path) {
      //   out('Closed ' + path);
      // };

  );
#endif

  G4cout << "setTheEngine" << G4endl;
  // Choose the Random engine
  G4Random::setTheEngine(new CLHEP::RanecuEngine);

  G4cout << "new runManager" << G4endl;
  // Construct the default run manager
  runManager = new G4RunManager;

  // Activate command-based scorer
  G4ScoringManager::GetScoringManager();

  G4cout << "SetUserInitialization" << G4endl;
  // Detector construction
  runManager->SetUserInitialization(new B1DetectorConstruction());

  G4cout << "physicsList" << G4endl;
  // Physics list
  G4VModularPhysicsList *physicsList = new QBBC;
  physicsList->SetVerboseLevel(0);
  runManager->SetUserInitialization(physicsList);

  G4cout << "B1ActionInitialization" << G4endl;
  // User action initialization
  runManager->SetUserInitialization(new B1ActionInitialization());

  G4cout << "UImanager" << G4endl;
  // Get the pointer to the User Interface manager
  UImanager = G4UImanager::GetUIpointer();
}

void run(std::string name)
{

  G4cout << "ApplyCommand" << G4endl;
  // batch mode
  G4String command = "/control/execute ";
  G4String fileName = name;

  auto t1 = std::chrono::high_resolution_clock::now();

  UImanager->ApplyCommand(command + fileName);

  auto t2 = std::chrono::high_resolution_clock::now();

  std::chrono::duration<double, std::milli> ms_double = t2 - t1;

  G4cout << ms_double.count() << "ms\n";
}

// std::vector<std::string> getMessages(){
//   //get message queue
//   auto messageQueue = dynamic_cast<const B1RunAction *>(
//       runManager->GetUserRunAction()
//   )->GetMessageQueue();
//   auto messages = messageQueue->Dump();
//   std::vector<std::string> message_vector(messages.size());
//   for (int i = 0; i < messages.size(); i++)
//   {
//     message_vector[i] = messages[i];
//   }
//   return message_vector;
// }

void clear()
{
  // Job termination
  // Free the store: user actions, physics_list and detector_description are
  // owned and deleted by the run manager, so they should not be deleted
  // in the main() program !
  G4cout << "delte" << G4endl;
  delete runManager;
  G4cout << "runManager" << G4endl;
}

#ifndef __EMSCRIPTEN__
int main(int argc, char **argv)
{
  init();
  run("exampleB1.in");
  // auto messages = getMessages();
  // for (auto message : messages)
  // {
  //   G4cout << message << G4endl;
  // }
  clear();
}
#endif

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(my_module)
{
  emscripten::function("init", &init);
  emscripten::function("run", &run);
  emscripten::function("clear", &clear);
  // emscripten::function("getMessages", &getMessages);
  emscripten::register_vector<std::string>("vector<string>");
}
#endif

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo.....
