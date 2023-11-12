import React, {useEffect, useState} from 'react';
import { View, Text, StyleSheet, ScrollView, Button, TextInput, Modal, FlatList, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc  } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Menu, MenuOptions, MenuOption, MenuTrigger, MenuProvider } from 'react-native-popup-menu';


function ListopiaScreen({isDarkMode}) {
  const [savedToDoList, setSavedToDoList] = useState([]);
  const [code, setCode] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [selectedToDoList, setSelectedToDoList] = useState(null);
  const handleCodeGetClick = async () => {
    setShowTable(false);
    try {
      const q = query(collection(db, 'Lists'), where('Code', '==', code.toLowerCase()));
      const querySnapshot = await getDocs(q);

      const receivedLists = [];
      querySnapshot.forEach((doc) => {
        const listData = doc.data();
        receivedLists.push(listData);
      });

      const extractedLists = receivedLists.map((listData) => ({
        name: listData.ListName,
        items: JSON.parse(listData.Items),
      }));

      setSavedToDoList(extractedLists);
      try {
        await AsyncStorage.setItem('todolist', JSON.stringify(extractedLists));
        console.log('Extracted lists saved to Phone storage');
      } catch (error) {
        console.error('Error saving extracted lists: ', error);
      }
    } catch (error) {
      console.error('Error getting lists: ', error);
    }
  };

  // useEffect(() => {
  //   const retrieveData = async () => {
  //     try {
  //       const savedLists = await AsyncStorage.getItem('todolist');
  //       if (savedLists) {
  //         const parsedLists = JSON.parse(savedLists);
  //         setSavedToDoList(parsedLists);
  //       }
  //     } catch (error) {
  //       console.error('Error retrieving saved lists: ', error);
  //     }
  //   };
  
  //   retrieveData();
  // }, []);

  const handleCodeSaveClick = async () => {
    try {
      let codeWord = code.toLowerCase();
      const q = query(collection(db, 'Lists'), where('Code', '==', codeWord));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('Deleted existing documents with code: ', codeWord);
      console.log('Saving lists:', savedToDoList);
      if (newListMade) {
        savedToDoList.push(newList);
      }
      const dataToSave = savedToDoList.map((list) => ({
        Code: codeWord,
        ListName: list.name,
        Items: JSON.stringify(list.items),
      }));
      console.log(dataToSave);
      const savePromises = dataToSave.map((data) => addDoc(collection(db, 'Lists'), data));
      await Promise.all(savePromises);
  
      alert('Lists saved.');
    } catch (error) {
      console.error('Error saving lists: ', error);
    }
  };


  const handleListSave = async () => {
    try {
      await AsyncStorage.setItem('savedToDoLists', JSON.stringify(savedToDoList));
      console.log('Lists saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving lists: ', error);
    }
  };

  const loadLists = async () => {
    try {
      const savedLists = await AsyncStorage.getItem('savedToDoLists');
      if (savedLists) {
        const parsedLists = JSON.parse(savedLists);
        setSavedToDoList(parsedLists);
        console.log('Lists loaded from AsyncStorage');
      }
    } catch (error) {
      console.error('Error loading lists: ', error);
    }
  };
  
  const handleItemLongPress = (name) => {
    setShowContextMenu(true);
    setSelectedListItem(name);
  };
  

  const toggleTable = async (listName) => {
    setShowContextMenu(false);
    let selectedList = savedToDoList.find((list) => list.name === listName);
    selectedList = reorderList(selectedList);
    
    setSelectedToDoList(selectedList);
    setShowTable(true);
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listContainer}
      onPress={() => toggleTable(item.name)}
      onLongPress={() => handleItemLongPress(item.name)}
      activeOpacity={0.8}
    >
      <Text style={styles.listName}>{item.name}</Text>
      <Text style={styles.listItems}>
        {item.items.map((item) => item.name).join(', ')}
      </Text>
      {showContextMenu && item.name == selectedListItem && (
        <View style={styles.contextMenu}>
          <TouchableOpacity onPress={handleDeleteList} style={styles.contextMenuItem}>
            <Text style={styles.contextMenuItemText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const toggleItemSelection = (item) => {
    const updatedItems = selectedToDoList.items.map((listItem) => {
      if (listItem.name === item.name) {
        return {
          ...listItem,
          selected: !listItem.selected,
        };
      }
      return listItem;
    });
  
    const updatedSelectedList = {
      name: selectedToDoList.name,
      items: updatedItems,
    };
    let sortedSelectedList = reorderList(updatedSelectedList);
  
    // Find the index of the selected list in savedToDoList
    const selectedIndex = savedToDoList.findIndex(
      (list) => list.name === selectedToDoList.name
    );
  
    // Create a copy of savedToDoList and update the selected list
    const updatedSavedToDoList = [...savedToDoList];
    updatedSavedToDoList[selectedIndex] = updatedSelectedList;
    // Update savedToDoList state
    setSavedToDoList(updatedSavedToDoList);
    setSelectedToDoList(sortedSelectedList);
    setShowTable(true);
  
    // Save the updated list to AsyncStorage
    // handleListSave();
  };
  
  const [itemExpanded, setItemExpanded] = useState(''); // State to track expansion
  const [showDatePicker, setShowDatePicker] = useState(false); // State to track expansion

  const toggleExpansion = (item) => {
    if (item.name!=itemExpanded) {
      setItemExpanded(item.name);
    }
    else {
      setItemExpanded("");
    }
    
    setShowDatePicker(false);
  };
  const toggleDatePicker = () => {
    setShowDatePicker((showDatePicker) => !showDatePicker);
  };

  const handleNotesChange = (item, text) => {
    const updatedItems = selectedToDoList.items.map((listItem) => {
      if (listItem.name === item.name) {
        return {
          ...listItem,
          notes: text,
        };
      }
      return listItem;
    });
    setSelectedToDoList({
      ...selectedToDoList,
      items: updatedItems,
    });
    const selectedIndex = savedToDoList.findIndex(
      (list) => list.name === selectedToDoList.name
    );
    const updatedSavedToDoList = [...savedToDoList];
    updatedSavedToDoList[selectedIndex] = selectedToDoList;
    setSavedToDoList(updatedSavedToDoList);
  };

  const [taskDate, setTaskDate] = useState(null); // State to track expansion
  const handleDeadlineChange = (event, value) => {
    console.log(value);
    setTaskDate(value);
    const updatedItems = selectedToDoList.items.map((listItem) => {
      if (listItem.name === itemExpanded) {
        return {
          ...listItem,
          deadline: value,
        };
      }
      return listItem;
    });
    setSelectedToDoList({
      ...selectedToDoList,
      items: updatedItems,
    });
    const selectedIndex = savedToDoList.findIndex(
      (list) => list.name === selectedToDoList.name
    );
    const updatedSavedToDoList = [...savedToDoList];
    updatedSavedToDoList[selectedIndex] = selectedToDoList;
    setSavedToDoList(updatedSavedToDoList);
  };

  const renderNewSelectedItem = ({ item }) => {
    const isExpanded = item.name == itemExpanded;
    return (
    <View style={styles.selectedListItem}>
        <View style={styles.checkboxContainer}>
          <TouchableWithoutFeedback onPress={() => toggleItemSelection(item)}>          
                <MaterialIcons
                  name={item.selected ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color="black"
                  style={styles.checkboxIcon}
                />          
          </TouchableWithoutFeedback>
          <Text style={styles.selectedListItemText} onPress={() => toggleExpansion(item)}>
              {item.name}
          </Text>
        </View>

        {isExpanded && (
        <View style={styles.expandedContainer}>
          <TextInput
            placeholder="Notes"
            value={item.notes || ''}
            onChangeText={(text) => handleNotesChange(item, text)}
          />
          <TouchableWithoutFeedback onPress={toggleDatePicker}>
            <Text style={styles.deadlineLabel}>Deadline</Text>
          </TouchableWithoutFeedback>
          {!!item.deadline && (<Text style={styles.deadlineText}>{item.deadline.toString()}</Text>)}
          {showDatePicker && (
            <DateTimePicker
              value={item.deadline ? new Date(item.deadline) : new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDeadlineChange}
            />
          )}
        </View>
      )}
      </View>
    );
  };

  const renderSelectedItem = ({ item }) => {
    const isExpanded = item.name == itemExpanded;
    return (
      <View style={styles.selectedListItem}>
        <TouchableWithoutFeedback onPress={() => toggleItemSelection(item)}>
          <View style={styles.checkboxContainer}>
              <MaterialIcons
                name={item.selected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color="black"
                style={styles.checkboxIcon}
              />
            <Text style={styles.selectedListItemText} onPress={() => toggleExpansion(item)}>
            {item.name}
            </Text>
          </View>
        </TouchableWithoutFeedback>

        {isExpanded && (
        <View style={styles.expandedContainer}>
          <TextInput
            placeholder="Notes"
            value={item.notes || ''}
            onChangeText={(text) => handleNotesChange(item, text)}
          />
          <TouchableWithoutFeedback onPress={toggleDatePicker}>
            <Text style={styles.deadlineLabel}>Deadline</Text>
          </TouchableWithoutFeedback>
          {!!item.deadline && (<Text style={styles.deadlineText}>{item.deadline.toString()}</Text>)}
          {showDatePicker && (
            <DateTimePicker
              value={item.deadline ? new Date(item.deadline) : new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDeadlineChange}
            />
          )}
        </View>
      )}
      </View>
    );
  };

  const [showModal, setShowModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [newListMade, setNewListMade] = useState(false);

  const handleAddTask = () => {
    if (!taskName) {
      return;
    }
    let updatedItems;
    let updatedToDoList;
    if (!creatingNewList) {
      updatedItems = [...selectedToDoList.items, { name: taskName, notes: taskNotes, deadline: deadline }];
      updatedToDoList = {
        ...selectedToDoList,
        items: updatedItems,
      };
      setSelectedToDoList({
        ...selectedToDoList,
        items: updatedItems,
      });
      const selectedIndex = savedToDoList.findIndex(
        (list) => list.name === selectedToDoList.name
      );
    
      const updatedSavedToDoList = [...savedToDoList];
      updatedSavedToDoList[selectedIndex] = updatedToDoList;
      setSavedToDoList(updatedSavedToDoList);
      
    } else {
      updatedItems = [...newList.items, { name: taskName, notes: taskNotes, deadline: deadline }];
      updatedToDoList = {
        name: newListName,
        items: updatedItems,
      };
      setSelectedToDoList(updatedToDoList);
      setNewList(updatedToDoList);
      setCreatingNewList(false);
      setNewListMade(true);
      setShowTable(true);
    }
  
    // Clear the form inputs
    setTaskName('');
    setTaskNotes('');
    setDeadline(null);
  
    // Close the modal
    setShowModal(false);
  };
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  

  const [creatingNewList, setCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newList, setNewList] = useState({'name':'','items':[]});
  const handleAddList = () => {
    setSelectedToDoList(null);
    setCreatingNewList(!creatingNewList);
    setNewList({'name':'', 'items' : []});
    if (!creatingNewList) {
      setShowTable(false);
    } else {
      setNewListName('');
    }
  };
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedListItem, setSelectedListItem] = useState(null);


  const handleDeleteList = () => {
    const updatedLists = savedToDoList.filter(list => list.name !== selectedListItem);
    console.log("Deleting List:", selectedListItem);
    setSelectedToDoList([]);
    setSavedToDoList(updatedLists);
    setShowContextMenu(false);
    handleListSave();
    console.log(updatedLists);
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.plusHeaderRow}>
      <Text style={[styles.header, isDarkMode && styles.headerDark]}>Listopia</Text>
        <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddList}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonLabel}>+</Text>
        </TouchableOpacity>
      </View>
      {creatingNewList && (
        <View style={styles.selectedListContainer}>
          <View style={styles.headerRow}>
            <TextInput
              placeholder="List Name"
              value={newListName}
              onChangeText={setNewListName}
              style={[styles.selectedListHeader, isDarkMode && styles.selectedListHeaderDark]}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonLabel}>+</Text>
            </TouchableOpacity>
          </View>
            <FlatList
              data={showTable ? newList.items : []}
              renderItem={renderNewSelectedItem}
              keyExtractor={(item, index) => index.toString()}
            />
        </View>
      
      )}

      {selectedToDoList && showTable && (
        <View style={styles.selectedListContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.selectedListHeader, isDarkMode && styles.selectedListHeaderDark]}>{selectedToDoList.name}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonLabel}>+</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={showTable ? selectedToDoList.items : []}
            renderItem={renderSelectedItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      
      )}
      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            placeholder="Task Name"
            value={taskName}
            onChangeText={setTaskName}
            style={styles.finput}
          />
          <TextInput
            placeholder="Task Notes"
            value={taskNotes}
            onChangeText={setTaskNotes}
            style={styles.finput}
          />
          <DateTimePicker
              value={selectedDate}
              mode="datetime"
              onChange={(event, date) => setDeadline(date || selectedDate)}
            />
            <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleAddTask}
              activeOpacity={0.8}
            >
            <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowModal(false)}
              activeOpacity={0.8}
            >
            <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {savedToDoList.length>0 && (
        <View style={styles.selectedListContainer}>
            <FlatList
                  data={savedToDoList}
                  renderItem={renderItem}
                  keyExtractor={(item, index) => index.toString()}
                />
        </View>
      
      )}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Code Word"
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleCodeGetClick}
            activeOpacity={0.8}
          >
          <Text style={styles.buttonText}>Get</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleCodeSaveClick}
            activeOpacity={0.8}
          >
          <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
      
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '20%',
    marginTop: '5%',
    height: 'auto',
    width: '100%',
    paddingBottom: '30%',
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    paddingBottom: 20,
    marginRight: 30,
  },
  headerDark: {
    color: 'white',
  },
  plusHeaderRow: {
    flexDirection: 'row',
    width: '80%',
    justifyContent: 'center',
    // alignItems: 'right',
    marginBottom: 20,
    marginRight: 20
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    padding: 15,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    backgroundColor: 'rgb(250 , 240 ,255)',
  },
  listName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItems: {
    elevation: 0,
    marginTop: 5,
    color: '#333',
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    backgroundColor: 'rgb(255 , 252 ,255)',
    borderRadius: 8,
    padding: 10,
    width: 200,
    marginVertical: 10,
  },

  selectedListContainer: {
    // borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 10,
    shadowColor: 'gray',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 20,
    padding: 10,
    // backgroundColor: 'white',
    width: '90%',
    alignSelf: 'center',
    marginBottom: 20,
    // backgroundColor: 'rgba(245, 240, 255, 0.8)'
  },

  selectedListHeader: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  selectedListHeaderDark: {
    color: 'white',
  },

  selectedListItem: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    width: 300,
    fontWeight: 'bold',
    backgroundColor: 'rgb(240 ,240 ,255)',
  },

  selectedListItemText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(240 ,240 ,255, 0.7)',
  },

  checkboxIcon: {
    padding: 2,
    marginRight: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
    top: 10
  },
  button: {
    backgroundColor: 'rgb(250 , 250 ,255)',
    borderRadius: 10,
    elevation: 5,
    shadowColor: 'gray',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
    marginHorizontal: 10,
    alignItems: 'center',
    width: 70,
    paddingLeft: 10,
    paddingRight: 10,
  },
  buttonText: {
    fontSize: 18,
    color: 'black',
  },
  addButtonContainer: {
    alignItems: 'flex-end', // Align the button to the right
    paddingRight: 20, // Adjust the padding to match the desired spacing
  },
  addButton: {
    backgroundColor: 'rgb(252 ,250 ,255)',
    borderRadius: 10, // Make it a circle by setting borderRadius to half of the width/height
    elevation: 5,
    shadowColor: 'gray',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    padding: 5,
    width: 38, // Set width and height to the same value for a circular button
    height: 38,
    justifyContent: 'center', // Center the content horizontally and vertically
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonLabel: {
    fontSize: 18,
    color: 'black',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgb(250 ,240 ,255, 0.8)',
  },
  finput: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    marginVertical: 20,
  },

  expandedContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgb(248 ,248 ,252)',
    borderRadius: 5,
  },

  deadlineLabel: {
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 5,
  },
  deadlineText: {
    marginTop: 5,
    marginBottom: 5,
  },

  contextMenu: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    elevation: 5,
    padding: 5,
  },
  contextMenuItem: {
    padding: 5,
  },
  contextMenuItemText: {
    fontSize: 16,
    color: 'black',
  },

});

export default ListopiaScreen;


function reorderList(selectedList: any) {
  const selectedItems = [];
  const nonSelectedItems = [];

  selectedList.items.forEach((item) => {
    if (item.selected) {
      selectedItems.push(item);
    } else {
      nonSelectedItems.push(item);
    }
  });

  const sortedItems = nonSelectedItems.concat(selectedItems);
  selectedList = {
    ...selectedList,
    items: sortedItems,
  };
  return selectedList;
}

const firebaseConfig = {
  apiKey: "<FirebaseParameter>",
  authDomain: "<FirebaseParameter>",
  projectId: "<FirebaseParameter>",
  storageBucket: "<FirebaseParameter>",
  messagingSenderId: "<FirebaseParameter>",
  appId: "<FirebaseParameter>",
  measurementId: "<FirebaseParameter>"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
