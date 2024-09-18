import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
	onAuthStateChanged,
} from "firebase/auth";
import {
	getFirestore,
	collection,
	query,
	orderBy,
	limit,
	getDocs,
	addDoc,
	updateDoc,
	doc,
	where,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyA6J5RBHVTGUp6aUsY51mLVxa5riZSmOWQ",
	authDomain: "mathquiz-8fb19.firebaseapp.com",
	projectId: "mathquiz-8fb19",
	storageBucket: "mathquiz-8fb19.appspot.com",
	messagingSenderId: "619109098191",
	appId: "1:619109098191:web:6d4db481acbe3e623d0dba",
	measurementId: "G-2JTXBT40V4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function MathQuizApp() {
	const [user, setUser] = useState(null);
	const [timeRemaining, setTimeRemaining] = useState(10);
	const [intervalId, setIntervalId] = useState(null);
	const [score, setScore] = useState(0);
	const [quizQuestion, setQuizQuestion] = useState("");
	const [result, setResult] = useState(null); // Store correct result
	const [displayedResult, setDisplayedResult] = useState(null); // Store displayed result
	const [isGameOver, setIsGameOver] = useState(false);
	const [leaderboard, setLeaderboard] = useState([]);
	const [startPageVisibility, setStartPageVisibility] = useState("hidden");

	// Handle SignIn
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				setUser(user);
				console.log(user.displayName);
				setStartPageVisibility("visible");
				fetchLeaderboard()
			} else {
				setUser(null);
			}
		});
		return () => unsubscribe();
	}, []);

	// Handle Google sign-in
	const SignIn = () => {
		signInWithPopup(auth, provider)
			.then((result) => {
				setUser(result.user); // Set the logged-in user
			})
			.catch((error) => {
				console.error(error);
			});
	};

	// Start the quiz
	const startQuiz = () => {
		generateQuiz();
		startTimer();
		setStartPageVisibility("hidden");
	};

	// Start the timer
	const startTimer = () => {
		const id = setInterval(() => {
			setTimeRemaining((prevTime) => {
				if (prevTime <= 0) {
					clearInterval(id);
					gameOver();
					return 0;
				}
				return prevTime - 1;
			});
		}, 1000);
		setIntervalId(id);
	};

	// Generate quiz question
	const generateQuiz = () => {
		const firstNum = Math.floor(Math.random() * 100);
		const secondNum = Math.floor(Math.random() * 10);
		const operators = ["+", "-", "*", "/"];
		const randomOperator =
			operators[Math.floor(Math.random() * operators.length)];

		let result;
		switch (randomOperator) {
			case "+":
				result = firstNum + secondNum;
				break;
			case "-":
				result = firstNum - secondNum;
				break;
			case "*":
				result = firstNum * secondNum;
				break;
			case "/":
				result = secondNum === 0 ? firstNum / 1 : firstNum / secondNum;
				result = Math.round(result * 100) / 100;
				break;
			default:
				break;
		}

		const isCorrect = Math.random() > 0.5;
		const displayedResult = isCorrect
			? result
			: result + Math.floor(Math.random() * 10) - 5;

		setQuizQuestion(`${firstNum} ${randomOperator} ${secondNum} = ${displayedResult}`);
		setResult(result); // Store correct result
		setDisplayedResult(displayedResult); // Store displayed result
	};

	// Check the answer
	const checkAnswer = (isCorrectAnswer) => {
		setScore((prevScore) => prevScore + (isCorrectAnswer ? 1 : 0));
		setTimeRemaining((prevTime) => prevTime + (isCorrectAnswer ? 2 : -3));
		generateQuiz();
	};

	// useEffect to handle score submission after game over
	useEffect(() => {
		if (isGameOver) {
			submitScore(score); // Ensure the latest score is passed
			fetchLeaderboard(); // Fetch the updated leaderboard
		}
	}, [isGameOver]); // Trigger this effect only when isGameOver changes

	// Game Over function (updated to avoid multiple triggers)
	const gameOver = () => {
		clearInterval(intervalId);
		setIsGameOver(true); // This will trigger the useEffect
		setStartPageVisibility("visible");
	};

	// Submit score to Firebase
	const submitScore = async (currentScore) => {
		if (user) {
			const userScores = collection(db, "scores");
			const q = query(userScores, where("userId", "==", user.uid));
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				const docRef = querySnapshot.docs[0].ref;
				await updateDoc(docRef, {
					score: Math.max(currentScore, querySnapshot.docs[0].data().score),
				});
			} else {
				await addDoc(userScores, {
					userId: user.uid,
					displayName: user.displayName,
					score: currentScore, // Use the passed score
					timestamp: new Date(),
				});
			}
		}
	};


	// Fetch leaderboard
	const fetchLeaderboard = async () => {
		const scoresQuery = query(
			collection(db, "scores"),
			orderBy("score", "desc"),
			limit(5)
		);
		const querySnapshot = await getDocs(scoresQuery);
		const leaderboardData = querySnapshot.docs.map((doc) => ({
			displayName: doc.data().displayName,
			score: doc.data().score,
		}));
		setLeaderboard(leaderboardData);
	};

	// Reset the game
	const resetGame = () => {
		setTimeRemaining(10);
		setScore(0);
		setIsGameOver(false);
		startQuiz();
	};

	return (
		<div>
			{/* Log In Page */}
			<div className={`absolute z-50 bg-white w-full h-full ${user ? "hidden" : "flex"} flex-col justify-center items-center`}>
				<h1 className=" text-3xl font-bold mb-10">Sign in with Google</h1>
				<button onClick={SignIn} className="inline-flex items-center px-3 py-2 text-lg text-white bg-blue-600 rounded-lg">
					Sign in
				</button>
			</div>

			{/* Start Page */}
			<div className={`absolute z-30 bg-white w-full h-full ${startPageVisibility === "visible" ? "flex" : "hidden"} flex-col justify-center items-center`}>
				<h1 className=" text-3xl font-bold mb-10">{isGameOver == true ? `Your Score : ${score}` : 'Math Quiz With Timer'}</h1>

				<div className=" overflow-y-scroll h-1/3 w-40 scrollbar-hide">
					<ol>
						{leaderboard.map((entry, index) => (
							<li key={index} className=" flex justify-between">
								<div>{entry.displayName}</div>
								<div>{entry.score}</div>
							</li>
						))}
					</ol>
				</div>

				<button onClick={isGameOver == true ? resetGame : startQuiz} className="inline-flex items-center px-5 py-3 text-xl text-white bg-blue-600 rounded-lg">
					{isGameOver == true ? 'Reset' : 'Start'}
				</button>
			</div>

			{/* Main Screen */}
			<div className=" w-full h-screen">
				<div className="w-full h-4/6 bg-cyan-500 flex flex-col justify-between items-center p-10 text-white font-bold">
					<div> SCORE : {score}</div>
					<div className=" text-5xl"> {quizQuestion} </div>
					<div className=" w-80 bg-gray-200 rounded-full h-2.5 opacity-75">
						<div
							className="bg-blue-700 h-2.5 rounded-full transition-all duration-1000 ease-linear"
							style={{ width: `${(timeRemaining / 10) * 100}%` }}
						></div>
					</div>

				</div>

				<div className="w-full h-2/6 bg-stone-50 flex justify-evenly items-center">
					<button
						onClick={() => {
							checkAnswer(result === displayedResult);
						}}
						className=" w-28 h-28 bg-green-500 rounded-full flex justify-center items-center"
					>
						<svg className=" w-20 h-20 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
							<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11.917 9.724 16.5 19 7.5" />
						</svg>
					</button>
					<button
						onClick={() => {
							checkAnswer(result !== displayedResult);
						}}
						className=" w-28 h-28 bg-red-500 rounded-full flex justify-center items-center"
					>
						<svg className="w-20 h-20 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
							<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6" />
						</svg>
					</button>
				</div>

			</div>
		</div>
	);
}

export default MathQuizApp;
