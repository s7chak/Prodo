import React, {useEffect, useState} from 'react';
import { View, Text, StyleSheet, ScrollView, Button, TextInput, Modal, FlatList, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc  } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';


function ReminderScreen({isDarkMode}) {
  const [savedToDoList, setSavedToDoList] = useState([]);
  const [code, setCode] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [selectedToDoList, setSelectedToDoList] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daysCount, setDaysCount] = useState(null);
  const [countButtonClicked, setCountButtonClicked] = useState(false);
  const [word, setWord] = useState("since");
  const [titleWord, setTitleWord] = useState("Days");
  const [isSaved, setIsSaved] = useState(false);
  const [isListSaved, setIsListSaved] = useState(false);
  const [isListRetrieved, setIsListRetrieved] = useState(false);
  const [savedDates, setSavedDates] = useState([]);

  const handleCodeGetClick = async () => {
    try {
      let codeWord = code.toLowerCase();
      const q = query(collection(db, "Reminders"), where("Code", "==", codeWord));
      const querySnapshot = await getDocs(q);
  
      const receivedDates = [];
      querySnapshot.forEach((doc) => {
        const dateData = doc.data();
        receivedDates.push({
          name: dateData.Name,        // Include the name property
          date: dateData.Date,
          type: dateData.Type,
        });
      });
      console.log(receivedDates);
      setSavedDates(receivedDates);
      setIsListRetrieved(true);
    } catch (error) {
      console.error("Error getting dates: ", error);
    }
  };

  useEffect(() => {
    const retrieveData = async () => {
      try {
        const savedLists = await AsyncStorage.getItem('todolist');
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          setSavedToDoList(parsedLists);
        }
      } catch (error) {
        console.error('Error retrieving saved lists: ', error);
      }
    };
  
    retrieveData();
  }, []);

  const handleCodeSaveClick = async () => {
    try {
      let codeWord = code.toLowerCase();
      const q = query(collection(db, 'Reminders'), where('Code', '==', codeWord));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('Deleted existing documents with code: ', codeWord);
      console.log('Saving lists:', savedDates);
      const dataToSave = savedDates.map((list) => ({
        Code: codeWord,
        Name: list.name,
        Date: list.date,
        Type: list.type
      }));
      console.log(dataToSave);
      const savePromises = dataToSave.map((data) => addDoc(collection(db, 'Reminders'), data));
      await Promise.all(savePromises);
  
      alert('Reminders saved.');
    } catch (error) {
      console.error('Error saving reminders: ', error);
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
  };
  

  
  const renderItem = ({ item }) => {
    const isExpanded = item.name == itemExpanded;
    return (
      <View style={styles.selectedListItem}>
        <TouchableWithoutFeedback onPress={() => toggleExpansion(item)}>
          <View style={styles.checkboxContainer}>
            <Text style={styles.selectedListItemText}>
              {item.name}
            </Text>
          </View>
        </TouchableWithoutFeedback>

        {isExpanded && (
        <View style={styles.expandedContainer}>
          <Text>Date: </Text>
          <TextInput
            placeholder="Date"
            value={item.date || ''}
            onChangeText={(text) => setReminderName(text)}
          />
          <RNPickerSelect
            onValueChange={(value) => setReminderType(value)}
            placeholder={{ label: 'Select a Reminder Type', value: null }}
            items={[
              { label: 'Annual', value: 'Annual' },
              { label: 'Semi Annual', value: 'Semi Annual' },
              { label: 'Monthly', value: 'Monthly' },
              { label: 'Weekly', value: 'Weekly' },
              { label: 'Daily', value: 'Daily' },
            ]}
            value={item.type}
            style={pickerSelectStyles}
          />
          {showDatePicker && (
            <DateTimePicker
              value={item.deadline ? new Date(item.Date) : new Date()}
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

  const [showModal, setShowModal] = useState(false);
  const [reminderName, setReminderName] = useState('');
  const [reminderType, setReminderType] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [newListMade, setNewListMade] = useState(false);

  function formatDate() {
    const date = new Date(reminderDate);
    switch (reminderType) {
      case 'Annual':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      case 'Monthly':
        return date.getDate().toString().padStart(2, '0');
      case 'Daily':
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`; // HH:mm format
      default:
        return '';
    }
  }

  const handleAddTask = () => {
    if (!reminderName) {
      return;
    }
    let updatedItems;
    let dateString = formatDate();
    updatedItems = [...savedDates, { name: reminderName, type: reminderType, date: dateString }];
    setSavedDates(updatedItems);
    // Clear the form inputs
    setReminderName('');
    setReminderType('');
    setReminderDate(null);
  
    // Close the modal
    setShowModal(false);
  };
  

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
    setSavedToDoList(updatedLists);
    setShowContextMenu(false);
    handleListSave();
    console.log(savedToDoList);
  };

  const handleDateChange = (event, date) => {
    if (date) {
      setReminderDate(date);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.plusHeaderRow}>
      <Text style={[styles.header, isDarkMode && styles.headerDark]}>Reminders</Text>
        <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonLabel}>+</Text>
        </TouchableOpacity>
      </View>
      
      {/* {selectedToDoList && showTable && (
        <View style={styles.selectedListContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.selectedListHeader, isDarkMode && styles.selectedListHeaderDark]}>{selectedToDoList.name}</Text>
          </View>
          <FlatList
            data={showTable ? selectedToDoList.items : []}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      )} */}

      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            placeholder="Reminder Name"
            value={reminderName}
            onChangeText={setReminderName}
            style={styles.finput}
          />
          <RNPickerSelect
            onValueChange={(value) => setReminderType(value)}
            placeholder={{ label: 'Select a Reminder Type', value: null }}
            items={[
              { label: 'Annual', value: 'Annual' },
              { label: 'Monthly', value: 'Monthly' },
              { label: 'Daily', value: 'Daily' },
            ]}
            value={reminderType}
            style={pickerSelectStyles}
          />
          <DateTimePicker
              value={reminderDate}
              mode="datetime"
              onChange={handleDateChange}
              style={styles.datepicker}
            />

            <Text style={styles.datelabel}>Selected Date: {reminderDate?reminderDate.toString():selectedDate.toString()}</Text>
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

      {savedDates.length>0 && (
        <View style={styles.selectedListContainer}>
            <FlatList
                  data={savedDates}
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
    width: '70%',
    marginVertical: 20,
  },

  expandedContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgb(248 ,248 ,252)',
    borderRadius: 5,
    alignItems: 'flex-start',
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
  datepicker: {
    marginTop: 30
  },
  datelabel: {
    marginTop: 20
  }
});
const pickerSelectStyles = {
  inputIOS: {
    marginTop: 10,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'purple',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
};

export default ReminderScreen;


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
