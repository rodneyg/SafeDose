module.exports = (req, res) => {
    console.log('Accessed /api/hello');
    res.status(200).json({ message: 'Hello from the API!' });
  };