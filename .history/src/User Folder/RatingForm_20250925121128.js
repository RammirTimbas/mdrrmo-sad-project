import React, { useState, useEffect } from "react";
import ReactStars from "react-rating-stars-component";
import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import "./ratingForm.css";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const RatingForm = ({ programId, userId, onClose, onSubmit }) => {
  const [trainerRating, setTrainerRating] = useState(0);
  const [programRating, setProgramRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('');
  const [existingRatingId, setExistingRatingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(null); // state to track submission
  const [userName, setUserName] = useState("");
  const [hasFullAttendance, setHasFullAttendance] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState("");

  const [certificateStatus, setCertificateStatus] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState(null);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  useEffect(() => {
    const checkCertificateRequest = async () => {
      try {
        const certQuery = query(
          collection(db, "Certificates"),
          where("userId", "==", userId),
          where("programId", "==", programId.id)
        );

        const certSnapshot = await getDocs(certQuery);

        if (!certSnapshot.empty) {
          const certData = certSnapshot.docs[0].data();
          console.log("🔍 Fetched certificate request:", certData);

          if (certData.certificateUrl) {
            setCertificateStatus("approved");
            setCertificateUrl(certData.certificateUrl);
          } else {
            setCertificateStatus("pending");
          }
        } else {
          setCertificateStatus("not_requested");
        }
      } catch (error) {
        console.error("❌ Error fetching certificate request:", error);
      }
    };

    checkCertificateRequest();
  }, [userId, programId.id]);

  useEffect(() => {
    const fetchUserName = async () => {
      const raterRef = collection(db, "User Informations");
      const raterQuery = query(raterRef, where("user_ID", "==", userId));
      const queryraterSnapshot = await getDocs(raterQuery);
      try {
        if (!queryraterSnapshot.empty) {
          const raterName = queryraterSnapshot.docs[0].data();
          setUserName(raterName.full_name);
          console.log(raterName.full_name);
        } else {
          console.error("Error fetching username:");
        }
      } catch (error) {
        console.error("Error fetching username:");
      }
    };
    fetchUserName();
  }, userId);

  useEffect(() => {
    const fetchExistingRating = async () => {
      try {
        const ratingsRef = collection(
          db,
          "Training Programs",
          programId.id,
          "ratings"
        );
        const ratingsQuery = query(ratingsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(ratingsQuery);

        if (!querySnapshot.empty) {
          const ratingData = querySnapshot.docs[0].data();
          setTrainerRating(ratingData.trainerRating);
          setProgramRating(ratingData.programRating);
          setFeedback(ratingData.feedback);
          setExistingRatingId(querySnapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Error fetching existing rating:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRating();
  }, [programId.id, userId]);

  useEffect(() => {
    const checkAttendance = async () => {
      try {
        const programRef = doc(db, "Training Programs", programId.id);
        const programSnap = await getDoc(programRef);

        if (!programSnap.exists()) {
          console.error("❌ Program data not found");
          setHasFullAttendance(false);
          setAttendanceSummary("0/1");
          return;
        }

        const programData = programSnap.data();
        const applicants = programData.approved_applicants || {};

        let userAttendance = [];
        let totalSessions = 0;
        let attendedSessions = 0;

        // 🔹 Find User's Attendance Record
        Object.keys(applicants).forEach((applicantId) => {
          const applicant = applicants[applicantId];
          if (applicant.user_id === userId) {
            userAttendance = applicant.attendance || [];
          }
        });

        console.log(`🔍 Checking Attendance for: ${userId}`);
        console.log("📌 User Attendance Data:", userAttendance);

        // 🔹 Determine Total Training Sessions
        if (
          programData.selected_dates &&
          programData.selected_dates.length > 0
        ) {
          totalSessions = programData.selected_dates.length;
          console.log(`📅 Total Sessions (Selected Dates): ${totalSessions}`);
        } else if (programData.start_date && programData.end_date) {
          // Convert Unix timestamps to days
          const startDate = new Date(programData.start_date * 1000);
          const endDate = new Date(programData.end_date * 1000);

          // Calculate total number of days in the range
          totalSessions =
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include start_date

          console.log(`📅 Total Sessions (Date Range): ${totalSessions}`);
        } else {
          totalSessions = 1; // Default to 1 day if no other info exists
          console.log("⚠ No date range or selected dates, assuming 1 session.");
        }

        // 🔹 Count the Attended Sessions
        attendedSessions = userAttendance.filter(
          (entry) => entry.remark && entry.remark.toLowerCase() === "present"
        ).length;

        // If no attendance records, show 0/totalSessions (not 0/0)
        if (!userAttendance || userAttendance.length === 0) {
          console.warn("⚠ No attendance records found for user.");
          setHasFullAttendance(false);
          setAttendanceSummary(`0/${totalSessions}`);
          return;
        }

        console.log(
          `✅ Attended Sessions: ${attendedSessions}/${totalSessions}`
        );

        setHasFullAttendance(attendedSessions === totalSessions);
        setAttendanceSummary(`${attendedSessions}/${totalSessions}`);
      } catch (error) {
        console.error("❌ Error checking attendance:", error);
        setHasFullAttendance(false);
        setAttendanceSummary("0/0");
      }
    };

    checkAttendance();
  }, [programId.id, userId]);

  const requestCertificate = async () => {
    try {
      // Check attendance before proceeding
      if (!hasFullAttendance) {
        Swal.fire(
          "Attendance Required",
          `You must have 100% attendance to request a certificate.\nYou attended ${attendanceSummary.split("/")[0]} out of ${attendanceSummary.split("/")[1]} days.`,
          "error"
        );
        return;
      }

      // 🔹 Check Firestore for existing certificate request
      const certQuery = query(
        collection(db, "Certificates"),
        where("userId", "==", userId),
        where("programId", "==", programId.id)
      );
      const certSnapshot = await getDocs(certQuery);

      if (!certSnapshot.empty) {
        const certData = certSnapshot.docs[0].data();
        console.log("🔍 Certificate Request Found:", certData);

        if (certData.status === "approved" && certData.certificateUrl) {
          onSubmit();
          // ✅ If already approved, download immediately
          window.open(certData.certificateUrl, "_blank");

          return;
        } else if (certData.status === "rejected") {
          Swal.fire(
            "Notice",
            "Your request have been rejected.  Please visit the office for more details",
            "info"
          );
          return;
        } else {
          // 🔸 If still pending, show info message
          Swal.fire(
            "Already Requested",
            "Your request is being processed.",
            "info"
          );
          return;
        }
      }

      // 🔹 Fetch Approved Applicants
      const programRef = doc(db, "Training Programs", programId.id);
      const programSnap = await getDoc(programRef);

      if (!programSnap.exists()) {
        console.error("❌ Program data not found");
        return;
      }

      const programData = programSnap.data();
      const applicants = programData.approved_applicants || {};

      // 🔹 Sort applicants alphabetically
      const sortedApplicants = Object.values(applicants)
        .filter((applicant) => applicant.status === "approved")
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      // 🔹 Find User's Index (1-based)
      const userIndex =
        sortedApplicants.findIndex(
          (applicant) => applicant.user_id === userId
        ) + 1;

      if (userIndex === 0) {
        console.error("❌ User not found in approved applicants");
        return;
      }

      // 🔹 Ensure userName and program type are valid
      const safeUserName = userName ? userName.trim() : "Unknown User";
      const safeProgramType = programId.type
        ? programId.type.trim()
        : "Unknown Program";

      // 🔹 Generate Serial Number
      const nameInitials = safeUserName
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() : ""))
        .join("");

      const typeInitials = safeProgramType
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() : ""))
        .join("");

      const formattedDate = programId.start_date
        ? new Date(programId.start_date * 1000)
            .toLocaleDateString("en-GB")
            .split("/")
            .reverse()
            .join("")
        : "N/A";

      let dateHumanReadable = "N/A";

      if (programId.selected_dates && programId.selected_dates.length > 0) {
        // Convert all selected_dates to timestamps, find the earliest, and format it
        const earliestDate = Math.min(
          ...programId.selected_dates.map((date) => new Date(date).getTime())
        );
        dateHumanReadable = new Date(earliestDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long", // Full month name (e.g., January)
          day: "numeric",
        });
      } else if (programId.start_date) {
        // Convert Unix timestamp to "January DD, YYYY" format
        dateHumanReadable = new Date(
          programId.start_date * 1000
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      const serialNumber = `${nameInitials}-${typeInitials}-${formattedDate}-${userIndex}`;

      console.log(`📜 Serial Number: ${serialNumber}`);

      // 🔹 Store request in Firestore
      await addDoc(collection(db, "Certificates"), {
        userId: userId,
        userName: safeUserName,
        programId: programId.id,
        programName: programId.type || "N/A",
        serialNumber: serialNumber,
        programDate: dateHumanReadable,
        batchCode: programId.batchCode || "N/A",
        location: programId.program_venue,
        status: "pending",
        requestDate: new Date(),
      });

      Swal.fire(
        "Request Sent",
        "Your certificate request has been submitted for approval.",
        "success"
      );
    } catch (error) {
      console.error("Error requesting certificate:", error);
      Swal.fire("Error", "Failed to request certificate.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Set submitting state\

    const submittedUsername = isAnonymous ? "Anonymous" : userName;

    try {
      if (existingRatingId) {
        const ratingRef = doc(
          db,
          "Training Programs",
          programId.id,
          "ratings",
          existingRatingId
        );
        await updateDoc(ratingRef, {
          username: submittedUsername,
          trainerRating,
          programRating,
          feedback,
        });
      } else {
        const ratingsRef = collection(
          db,
          "Training Programs",
          programId.id,
          "ratings"
        );
        await addDoc(ratingsRef, {
          username: userName,
          userId,
          trainerRating,
          programRating,
          feedback,
        });
      }

      // Reset the form
      setTrainerRating(0);
      setProgramRating(0);
      setFeedback("");
      setExistingRatingId(null);
      setIsAnonymous(false);

      await requestCertificate();
      onClose(); // Close the form
    } catch (error) {
      console.error("Error submitting rating:", error);
      Swal.fire("Error", "Failed to submit rating, please try again.", "error");
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  if (loading) {
  return <div style={{textAlign:'center',padding:'2rem'}}>Loading...</div>;
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
      maxWidth: 400,
      margin: '2rem auto',
      padding: '2rem',
      position: 'relative',
      transition: 'box-shadow 0.3s',
      minHeight: 350,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#222',
        textAlign: 'center',
        marginBottom: '1.5rem',
        letterSpacing: '0.02em',
      }}>
        Rate Before Downloading Certificate
        <button
          type="button"
          style={{position:'absolute',top:16,right:16,background:'#f3f4f6',color:'#222',border:'none',borderRadius:8,padding:'0.5rem 0.8rem',fontWeight:600,boxShadow:'0 1px 4px rgba(60,60,120,0.08)',cursor:'pointer'}}
          onClick={onClose}
        >✕</button>
      </h2>

      <div style={{
        width: '100%',
        minHeight: 220,
        position: 'absolute',
        left: step === 1 ? 0 : transitionDirection === 'right' ? '-100%' : '100%',
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
          maxWidth: 400,
          margin: '2rem auto',
          padding: '2rem',
          position: 'relative',
          transition: 'box-shadow 0.3s',
          minHeight: 350,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#222',
            textAlign: 'center',
            marginBottom: '1.5rem',
            letterSpacing: '0.02em',
          }}>
            Rate Before Downloading Certificate
            <button
              type="button"
              style={{position:'absolute',top:16,right:16,background:'#f3f4f6',color:'#222',border:'none',borderRadius:8,padding:'0.5rem 0.8rem',fontWeight:600,boxShadow:'0 1px 4px rgba(60,60,120,0.08)',cursor:'pointer'}}
              onClick={onClose}
            >✕</button>
          </h2>
          <div style={{position:'relative',width:'100%',height:240}}>
            {/* Step 1: Trainer rating */}
            {step === 1 && (
              <div style={{
                width: '100%',
                minHeight: 220,
                position: 'absolute',
                left: 0,
                opacity: 1,
                transition: 'left 0.4s, opacity 0.4s',
                top: 0,
              }}>
                <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Rate the Trainer</h4>
                <p style={{textAlign:'center',color:'#666',marginBottom:16}}>
                  How effective and knowledgeable was <b>{programId.trainer_assigned}</b>?
                </p>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:24}}>
                  <ReactStars
                    count={5}
                    value={trainerRating}
                    onChange={setTrainerRating}
                    size={40}
                    activeColor={isSubmitting ? '#ccc' : '#facc15'}
                    isHalf={false}
                  />
                </div>
                <button
                  type="button"
                  style={{
                    width:'100%',background:trainerRating>0?'#2563eb':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',marginTop:8,transition:'background 0.2s',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:trainerRating>0?'pointer':'not-allowed'
                  }}
                  disabled={trainerRating===0}
                  onClick={()=>{
                    setTransitionDirection('left');
                    setAnimating(true);
                    setTimeout(()=>{setStep(2);setAnimating(false);},350);
                  }}
                >Next</button>
              </div>
            )}
            {/* Step 2: Program rating */}
            {step === 2 && (
              <div style={{
                width: '100%',
                minHeight: 220,
                position: 'absolute',
                left: 0,
                opacity: 1,
                transition: 'left 0.4s, opacity 0.4s',
                top: 0,
              }}>
                <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Rate the Program</h4>
                <p style={{textAlign:'center',color:'#666',marginBottom:16}}>
                  How would you rate the quality of <b>{programId.program_title}</b>?
                </p>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:24}}>
                  <ReactStars
                    count={5}
                    value={programRating}
                    onChange={setProgramRating}
                    size={40}
                    activeColor={isSubmitting ? '#ccc' : '#facc15'}
                    isHalf={false}
                  />
                </div>
                <div style={{
                  background: '#fff',
                  borderRadius: 20,
                  boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
                  maxWidth: 400,
                  margin: '2rem auto',
                  padding: '2rem',
                  position: 'relative',
                  transition: 'box-shadow 0.3s',
                  minHeight: 350,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                  <button
                    type="button"
                    style={{position:'absolute',top:16,right:16,background:'#f3f4f6',color:'#222',border:'none',borderRadius:8,padding:'0.5rem 0.8rem',fontWeight:600,boxShadow:'0 1px 4px rgba(60,60,120,0.08)',cursor:'pointer',zIndex:2}}
                    onClick={onClose}
                  >✕</button>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#222',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    letterSpacing: '0.02em',
                  }}>
                    Rate Before Downloading Certificate
                  </h2>
                  <div style={{position:'relative',width:'100%',height:240}}>
                    {step === 1 && (
                      <div style={{width:'100%',minHeight:220,position:'absolute',left:0,opacity:1,transition:'left 0.4s, opacity 0.4s',top:0}}>
                        <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Rate the Trainer</h4>
                        <p style={{textAlign:'center',color:'#666',marginBottom:16}}>
                          How effective and knowledgeable was <b>{programId.trainer_assigned}</b>?
                        </p>
                        <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:24}}>
                          <ReactStars
                            count={5}
                            value={trainerRating}
                            onChange={setTrainerRating}
                            size={40}
                            activeColor={isSubmitting ? '#ccc' : '#facc15'}
                            isHalf={false}
                          />
                        </div>
                        <button
                          type="button"
                          style={{width:'100%',background:trainerRating>0?'#2563eb':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',marginTop:8,transition:'background 0.2s',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:trainerRating>0?'pointer':'not-allowed'}}
                          disabled={trainerRating===0}
                          onClick={()=>{
                            setTransitionDirection('left');
                            setAnimating(true);
                            setTimeout(()=>{setStep(2);setAnimating(false);},350);
                          }}
                        >Next</button>
                      </div>
                    )}
                    {step === 2 && (
                      <div style={{width:'100%',minHeight:220,position:'absolute',left:0,opacity:1,transition:'left 0.4s, opacity 0.4s',top:0}}>
                        <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Rate the Program</h4>
                        <p style={{textAlign:'center',color:'#666',marginBottom:16}}>
                          How would you rate the quality of <b>{programId.program_title}</b>?
                        </p>
                        <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:24}}>
                          <ReactStars
                            count={5}
                            value={programRating}
                            onChange={setProgramRating}
                            size={40}
                            activeColor={isSubmitting ? '#ccc' : '#facc15'}
                            isHalf={false}
                          />
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button
                            type="button"
                            style={{width:'50%',background:'#d1d5db',color:'#222',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:'pointer'}}
                            onClick={()=>{
                              setTransitionDirection('right');
                              setAnimating(true);
                              setTimeout(()=>{setStep(1);setAnimating(false);},350);
                            }}
                          >Back</button>
                          <button
                            type="button"
                            style={{width:'50%',background:programRating>0?'#2563eb':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:programRating>0?'pointer':'not-allowed'}}
                            disabled={programRating===0}
                            onClick={()=>{
                              setTransitionDirection('left');
                              setAnimating(true);
                              setTimeout(()=>{setStep(3);setAnimating(false);},350);
                            }}
                          >Next</button>
                        </div>
                      </div>
                    )}
                    {step === 3 && (
                      <form
                        onSubmit={handleSubmit}
                        style={{width:'100%',minHeight:220,position:'absolute',left:0,opacity:1,transition:'left 0.4s, opacity 0.4s',top:0}}>
                        <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Feedback (Optional)</h4>
                        <textarea
                          id="feedback"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows="4"
                          style={{width:'100%',marginTop:8,padding:'1rem',border:'1px solid #e5e7eb',borderRadius:10,resize:'none',fontSize:'1rem',color:'#222',background:'#f9fafb',boxShadow:'0 1px 4px rgba(60,60,120,0.04)'}}
                          placeholder="How can we improve?"
                        />
                        <div style={{margin:'1rem 0',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}
                            onClick={() => setShowTooltip(!showTooltip)}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                          >
                            <span style={{fontWeight:500,color:'#555'}}>Anonymous Feedback</span>
                            <span style={{fontSize:'0.9em',color:'#aaa'}}>(?)</span>
                            <label style={{marginLeft:10,position:'relative',display:'inline-block',width:44,height:24}}>
                              <input
                                type="checkbox"
                                style={{display:'none'}}
                                checked={isAnonymous}
                                onChange={() => setIsAnonymous(!isAnonymous)}
                              />
                              <span style={{position:'absolute',top:0,left:0,width:44,height:24,background:isAnonymous?'#2563eb':'#d1d5db',borderRadius:12,transition:'background 0.2s'}}></span>
                              <span style={{position:'absolute',top:2,left:isAnonymous?22:2,width:20,height:20,background:'#fff',borderRadius:10,boxShadow:'0 1px 4px rgba(60,60,120,0.10)',transition:'left 0.2s'}}></span>
                            </label>
                          </div>
                          {showTooltip && (
                            <div style={{position:'absolute',left:0,top:'100%',marginTop:8,background:'#222',color:'#fff',fontSize:'0.95em',padding:10,borderRadius:8,boxShadow:'0 2px 8px rgba(60,60,120,0.12)',zIndex:10,width:220}}>
                              Turn ON to hide your name in the feedback. Turn OFF to show your name.
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button
                            type="button"
                            style={{width:'50%',background:'#d1d5db',color:'#222',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:'pointer'}}
                            onClick={()=>{
                              setTransitionDirection('right');
                              setAnimating(true);
                              setTimeout(()=>{setStep(2);setAnimating(false);},350);
                            }}
                          >Back</button>
                          <button
                            type="submit"
                            style={{width:'50%',background:(trainerRating>0&&programRating>0&&!isSubmitting)?'#22c55e':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:(trainerRating>0&&programRating>0&&!isSubmitting)?'pointer':'not-allowed',transition:'background 0.2s'}}
                            disabled={trainerRating===0||programRating===0||isSubmitting}
                          >{isSubmitting?"Submitting...":"Submit & Download Certificate"}</button>
                        </div>
                      </form>
                    )}
                  </div>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button
                    type="button"
                    style={{width:'50%',background:'#d1d5db',color:'#222',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:'pointer'}}
                    onClick={()=>{
                      setTransitionDirection('right');
                      setAnimating(true);
                      setTimeout(()=>{setStep(2);setAnimating(false);},350);
                    }}
                  >Back</button>
                  <button
                    type="submit"
                    style={{width:'50%',background:(trainerRating>0&&programRating>0&&!isSubmitting)?'#22c55e':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:(trainerRating>0&&programRating>0&&!isSubmitting)?'pointer':'not-allowed',transition:'background 0.2s'}}
                    disabled={trainerRating===0||programRating===0||isSubmitting}
                  >{isSubmitting?"Submitting...":"Submit & Download Certificate"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
            disabled={programRating===0}
            onClick={()=>{
              setTransitionDirection('left');
              setAnimating(true);
              setTimeout(()=>{setStep(3);setAnimating(false);},350);
            }}
          >Next</button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          minHeight: 220,
          position: 'absolute',
          left: step === 3 ? 0 : transitionDirection === 'left' ? '100%' : '-100%',
          opacity: step === 3 ? 1 : 0,
          transition: 'left 0.4s, opacity 0.4s',
          top: 80,
        }}
      >
        <h4 style={{textAlign:'center',fontWeight:600,fontSize:'1.1rem',marginBottom:8}}>Feedback (Optional)</h4>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows="4"
          style={{width:'100%',marginTop:8,padding:'1rem',border:'1px solid #e5e7eb',borderRadius:10,resize:'none',fontSize:'1rem',color:'#222',background:'#f9fafb',boxShadow:'0 1px 4px rgba(60,60,120,0.04)'}}
          placeholder="How can we improve?"
        />
        <div style={{margin:'1rem 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span style={{fontWeight:500,color:'#555'}}>Anonymous Feedback</span>
            <span style={{fontSize:'0.9em',color:'#aaa'}}>(?)</span>
            <label style={{marginLeft:10,position:'relative',display:'inline-block',width:44,height:24}}>
              <input
                type="checkbox"
                style={{display:'none'}}
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
              />
              <span style={{position:'absolute',top:0,left:0,width:44,height:24,background:isAnonymous?'#2563eb':'#d1d5db',borderRadius:12,transition:'background 0.2s'}}></span>
              <span style={{position:'absolute',top:2,left:isAnonymous?22:2,width:20,height:20,background:'#fff',borderRadius:10,boxShadow:'0 1px 4px rgba(60,60,120,0.10)',transition:'left 0.2s'}}></span>
            </label>
          </div>
          {showTooltip && (
            <div style={{position:'absolute',left:0,top:'100%',marginTop:8,background:'#222',color:'#fff',fontSize:'0.95em',padding:10,borderRadius:8,boxShadow:'0 2px 8px rgba(60,60,120,0.12)',zIndex:10,width:220}}>
              Turn ON to hide your name in the feedback. Turn OFF to show your name.
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button
            type="button"
            style={{width:'50%',background:'#d1d5db',color:'#222',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:'pointer'}}
            onClick={()=>{
              setTransitionDirection('right');
              setAnimating(true);
              setTimeout(()=>{setStep(2);setAnimating(false);},350);
            }}
          >Back</button>
          <button
            type="submit"
            style={{width:'50%',background:(trainerRating>0&&programRating>0&&!isSubmitting)?'#22c55e':'#d1d5db',color:'#fff',fontWeight:600,padding:'0.75rem',borderRadius:10,border:'none',boxShadow:'0 2px 8px rgba(60,60,120,0.08)',cursor:(trainerRating>0&&programRating>0&&!isSubmitting)?'pointer':'not-allowed',transition:'background 0.2s'}}
            disabled={trainerRating===0||programRating===0||isSubmitting}
          >{isSubmitting?"Submitting...":"Submit & Download Certificate"}</button>
        </div>
      </form>
      </div>
      <button
        type="button"
        style={{position:'absolute',top:16,right:16,background:'#f3f4f6',color:'#222',border:'none',borderRadius:8,padding:'0.5rem 0.8rem',fontWeight:600,boxShadow:'0 1px 4px rgba(60,60,120,0.08)',cursor:'pointer'}}
        onClick={onClose}
      >✕</button>
    </div>
  );
};

export default RatingForm;
