// Correccions per MaquinaEnsenyable

// Afegir visualització de pose (skeleton) al canvas
window.drawPoseSkeleton = function(pose, ctx, scaleFactor = 1) {
  if (!pose || !pose.keypoints) return;
  
  const minConfidence = 0.3;
  
  // Dibuixar keypoints
  ctx.fillStyle = '#10b981';
  pose.keypoints.forEach(kp => {
    if (kp.score > minConfidence) {
      ctx.beginPath();
      ctx.arc(kp.position.x * scaleFactor, kp.position.y * scaleFactor, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  
  // Dibuixar skeleton (connexions)
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(pose.keypoints, minConfidence);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  
  adjacentKeyPoints.forEach(([kp1, kp2]) => {
    ctx.beginPath();
    ctx.moveTo(kp1.position.x * scaleFactor, kp1.position.y * scaleFactor);
    ctx.lineTo(kp2.position.x * scaleFactor, kp2.position.y * scaleFactor);
    ctx.stroke();
  });
};

// Verificar que hi ha mostres abans d'entrenar
const originalTrainModel = window.trainModel;
window.trainModel = async function() {
  const hasData = classes.some(c => c.samples && c.samples.length > 0);
  if (!hasData) {
    alert('Afig mostres a les classes abans d\'entrenar el model!');
    return;
  }
  
  if (modelType === 'audio') {
    const hasAudioData = classes.every(c => c.samples && c.samples.length >= 3);
    if (!hasAudioData) {
      alert('Els models d\'audio necessiten almenys 3 mostres per classe. Grava més àudio!');
      return;
    }
  }
  
  return originalTrainModel();
};
